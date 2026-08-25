import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { deserializeQuizResult } from "@/lib/quiz-utils"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const results = await prisma.quizResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Parse the JSON string fields back to objects for the frontend
    const formattedResults = results.map(deserializeQuizResult)

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error("Fetch history error:", error)
    return NextResponse.json(
      { message: "An error occurred while fetching history" },
      { status: 500 }
    )
  }
}
