import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
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
      userAnswers 
    } = await req.json()

    const userId = session.user.id

    const result = await prisma.quizResult.create({
      data: {
        userId,
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
      },
    })

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
