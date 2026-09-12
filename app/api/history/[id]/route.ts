import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { deserializeQuizResult, shuffleQuestions } from "@/lib/quiz-utils"
import { createQuizProof } from "@/lib/quiz-proof"

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    
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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const result = await prisma.quizResult.findUnique({ where: { id } })
    if (!result || result.userId !== session.user.id) {
      return NextResponse.json({ message: "Quiz not found or unauthorized" }, { status: 404 })
    }

    const formattedResult = deserializeQuizResult(result)
    const questions = shuffleQuestions(formattedResult.questions)
    const config = { ...formattedResult.config, numQuestions: questions.length }

    return NextResponse.json({
      questions,
      config,
      documentId: formattedResult.documentId ?? null,
      quizProof: createQuizProof(
        session.user.id,
        questions,
        config,
        formattedResult.documentId ?? null
      ),
    })
  } catch (error) {
    console.error("Create retake error:", error)
    return NextResponse.json({ message: "Failed to prepare quiz retake" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    
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
