import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { checkRateLimit } from "@/lib/rate-limit"
import { isValidEmail, normalizeEmail } from "@/lib/auth-security"

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 registrations per 15 minutes per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { message: "Too many registration attempts — please try again later" },
        { status: 429 }
      )
    }

    const { name, email: rawEmail, password } = await req.json()

    if (typeof rawEmail !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { message: "Missing email or password" },
        { status: 400 }
      )
    }

    const email = normalizeEmail(rawEmail)
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    // Password complexity: at least 8 characters
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name: typeof name === 'string' && name.trim() ? name.trim() : null,
        email,
        password: hashedPassword,
      },
    })

    return NextResponse.json(
      { message: "User registered successfully", user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    )
  }
}
