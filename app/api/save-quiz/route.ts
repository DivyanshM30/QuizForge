import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { questionHash, dueDateForWrong, REVIEW_QUEUE_CAP } from "@/lib/review"
import type { Question, Confidence } from "@/lib/types"

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

    const { 
      score, 
      totalQuestions, 
      accuracy, 
      timeTaken, 
      timeLimit, 
      config, 
      topicPerformance, 
      weakTopics, 
      revisionSuggestions,
      questions,
      userAnswers,
      documentId,
      confidences,
    } = await req.json()

    const userId = session.user.id

    // Only link a document the user actually owns.
    let linkedDocumentId: string | null = null;
    if (documentId && typeof documentId === 'string') {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId },
        select: { id: true },
      });
      linkedDocumentId = doc?.id ?? null;
    }

    const result = await prisma.quizResult.create({
      data: {
        userId,
        documentId: linkedDocumentId,
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
        confidences: Array.isArray(confidences) ? JSON.stringify(confidences) : null,
      },
    })

    // ── Smart Review: enqueue every missed question (best-effort, opt-in) ──
    try {
      const prefs = await prisma.user.findUnique({
        where: { id: userId },
        select: { reviewEnabled: true },
      })
      const confArr: Confidence[] = Array.isArray(confidences) ? confidences : []
      const missed: { q: Question; confidence: Confidence }[] = !prefs?.reviewEnabled
        ? []
        : (questions as Question[])
            .map((q, i) => ({ q, i }))
            .filter(({ q, i }) => (userAnswers as (string | null)[])[i] !== q.correctAnswer)
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

    return NextResponse.json(
      { message: "Quiz result saved successfully", result },
      { status: 201 }
    )
  } catch (error) {
    console.error("Save quiz error:", error)
    return NextResponse.json(
      { message: "An error occurred while saving the quiz" },
      { status: 500 }
    )
  }
}
