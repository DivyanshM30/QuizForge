import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { questionHash, dueDateForWrong, REVIEW_QUEUE_CAP } from "@/lib/review"
import { deriveQuizMetrics, deserializeQuizResult } from "@/lib/quiz-utils"
import { validateQuizSubmission } from "@/lib/quiz-submission"
import { verifyQuizProof } from "@/lib/quiz-proof"
import { openExam } from "@/lib/exam-token"
import type { Confidence, Question } from "@/lib/types"

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const isExam = typeof body?.quizProof === 'string' && body.quizProof.startsWith('exam1.')
    const exam = isExam ? openExam(body.quizProof, session.user.id) : null
    if (isExam && !exam) return NextResponse.json({ message: 'Exam verification failed' }, { status: 400 })
    // The encrypted attempt is authoritative; client questions/configuration cannot alter grading.
    const submission = validateQuizSubmission(exam ? { ...body, ...exam } : body)
    if (!submission.ok) {
      return NextResponse.json({ message: submission.error }, { status: 400 })
    }

    const {
      config,
      questions,
      userAnswers,
      confidences,
      quizProof,
    } = submission.value
    if (config.mode === 'exam' && !isExam) return NextResponse.json({ message: 'Exam verification failed' }, { status: 400 })

    // Expired proofs may retrieve an existing save, but cannot create a new one.
    const proofClaims = verifyQuizProof(quizProof, session.user.id, questions, config, Date.now(), { allowExpired: true })
    if (!proofClaims) {
      return NextResponse.json({ message: 'Quiz verification failed' }, { status: 400 })
    }
    const savedResponse = (result: NonNullable<Awaited<ReturnType<typeof prisma.quizResult.findUnique>>>, status = 200) =>
      NextResponse.json({
        message: 'Quiz result saved successfully',
        result: { ...deserializeQuizResult(result), timestamp: new Date(result.createdAt).getTime() },
      }, { status })
    const findSaved = () => prisma.quizResult.findUnique({ where: { id: proofClaims.attemptId } })
    const existing = await findSaved()
    if (existing && existing.userId === session.user.id) return savedResponse(existing)
    if (proofClaims.expiresAt <= Date.now()) {
      return NextResponse.json({ message: 'This attempt expired before it was saved. Start a new quiz.' }, { status: 400 })
    }
    const timeLimit = config.timeLimit * 60
    const timeTaken = Math.min(
      timeLimit,
      Math.max(0, Math.floor((Date.now() - proofClaims.issuedAt) / 1000))
    )
    const {
      score,
      totalQuestions,
      accuracy,
      topicPerformance,
      weakTopics,
      revisionSuggestions,
    } = deriveQuizMetrics(questions, userAnswers)

    const userId = session.user.id

    const linkedDocument = proofClaims.documentId
      ? await prisma.document.findFirst({
          where: { id: proofClaims.documentId, userId },
          select: { id: true },
        })
      : null
    let documentId = linkedDocument?.id ?? null

    const insertResult = () => prisma.quizResult.create({
      data: {
        id: proofClaims.attemptId,
        userId,
        documentId,
        score,
        totalQuestions,
        accuracy,
        timeTaken,
        timeLimit,
        config: JSON.stringify(config),
        topicPerformance: JSON.stringify(topicPerformance),
        weakTopics: JSON.stringify(weakTopics),
        revisionSuggestions: JSON.stringify(revisionSuggestions),
        questions: JSON.stringify(questions),
        userAnswers: JSON.stringify(userAnswers),
        confidences: confidences ? JSON.stringify(confidences) : null,
      },
    })

    const createResult = async () => {
      try {
        return await insertResult()
      } catch (error) {
        if (documentId !== null && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
          documentId = null
          return await insertResult()
        }
        throw error
      }
    }

    let result
    try {
      result = await createResult()
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const saved = await findSaved()
        if (saved && saved.userId === session.user.id) return savedResponse(saved)
        return NextResponse.json({ message: 'Quiz result has already been saved' }, { status: 409 })
      }
      throw error
    }

    // ── Smart Review: enqueue every missed question (best-effort, opt-in) ──
    try {
      const prefs = await prisma.user.findUnique({
        where: { id: userId },
        select: { reviewEnabled: true },
      })
      const confArr: Confidence[] = confidences ?? []
      const missed: { q: Question; confidence: Confidence }[] = !prefs?.reviewEnabled
        ? []
        : questions
            .map((q, i) => ({ q, i }))
            .filter(({ q, i }) => userAnswers[i] !== q.correctAnswer)
            .map(({ q, i }) => ({ q, confidence: confArr[i] ?? null }))
      if (missed.length > 0) {
        const current = await prisma.reviewItem.count({ where: { userId } })
        const room = Math.max(0, REVIEW_QUEUE_CAP - current)
        for (const { q, confidence } of missed.slice(0, room)) {
          const hash = questionHash(q)
          // Confidently-wrong resurfaces sooner (12h) than unsure-wrong (24h).
          const dueAt = dueDateForWrong(confidence)
          await prisma.reviewItem.upsert({
            where: { userId_questionHash: { userId, questionHash: hash } },
            // Seen wrong again - pull it back to the start of the ladder.
            update: { stage: 0, dueAt, lastResult: 'wrong' },
            create: {
              userId,
              questionHash: hash,
              question: JSON.stringify(q),
              topic: q.topic || 'General',
              stage: 0,
              dueAt,
              lastResult: 'wrong',
            },
          })
        }
      }
    } catch (e) {
      console.error('Review enqueue failed:', e)
    }

    return savedResponse(result, 201)
  } catch (error) {
    console.error("Save quiz error:", error)
    return NextResponse.json(
      { message: "An error occurred while saving the quiz" },
      { status: 500 }
    )
  }
}
