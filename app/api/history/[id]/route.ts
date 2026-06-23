import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { deserializeQuizResult } from "@/lib/quiz-utils"

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params
    
    const userId = session.user.id

    const result = await prisma.quizResult.findUnique({
      where: { id }
    })

    if (!result || result.userId !== userId) {
      return NextResponse.json(
        { message: "Quiz not found or unauthorized" },
        { status: 404 }
      )
    }

    // Parse the JSON string fields back to objects for the frontend
    const formattedResult = deserializeQuizResult(result)

    return NextResponse.json(formattedResult)
  } catch (error) {
    console.error("Fetch history details error:", error)
    return NextResponse.json(
      { message: "An error occurred while fetching history details" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params
    
    const userId = session.user.id

    // Verify ownership
    const quiz = await prisma.quizResult.findUnique({
      where: { id }
    })

    if (!quiz || quiz.userId !== userId) {
      return NextResponse.json(
        { message: "Quiz not found or unauthorized" },
        { status: 404 }
      )
    }

    await prisma.quizResult.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Quiz deleted successfully" })
  } catch (error) {
    console.error("Delete history error:", error)
    return NextResponse.json(
      { message: "An error occurred while deleting history" },
      { status: 500 }
    )
  }
}
