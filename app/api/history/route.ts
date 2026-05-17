import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // @ts-ignore
    const userId = session.id as string

    const results = await prisma.quizResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Parse the JSON string fields back to objects for the frontend
    const formattedResults = results.map(result => ({
      ...result,
      config: JSON.parse(result.config),
      topicPerformance: JSON.parse(result.topicPerformance),
      weakTopics: JSON.parse(result.weakTopics),
      revisionSuggestions: JSON.parse(result.revisionSuggestions),
      questions: JSON.parse(result.questions),
      userAnswers: JSON.parse(result.userAnswers),
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error("Fetch history error:", error)
    return NextResponse.json(
      { message: "An error occurred while fetching history" },
      { status: 500 }
    )
  }
}
