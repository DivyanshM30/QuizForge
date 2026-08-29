import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import {
  canUseGoogleIdentity,
  normalizeEmail,
  resolveAuthSecret,
} from "@/lib/auth-security"

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = normalizeEmail(credentials.email)
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, email: true, name: true, password: true },
        })

        // user.password is null for OAuth-only accounts - they must sign in
        // with their provider (or set a password via the reset flow).
        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    // Google sign-in: make sure a DB user exists (JWT sessions, no adapter).
    signIn: async ({ user, account, profile }) => {
      if (account?.provider === "google") {
        if (!user.email) return false

        const googleProfile = profile as { email_verified?: boolean; sub?: string } | undefined
        if (googleProfile?.email_verified !== true || !googleProfile.sub) return false

        const email = normalizeEmail(user.email)
        const existingBySubject = await prisma.user.findUnique({
          where: { googleSubject: googleProfile.sub },
          select: { id: true, email: true, password: true, googleSubject: true },
        })
        const existingUser = existingBySubject ?? await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, email: true, password: true, googleSubject: true },
        })

        if (!canUseGoogleIdentity(existingUser, googleProfile.sub)) return false
        if (existingBySubject && normalizeEmail(existingBySubject.email) !== email) return false

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              googleSubject: googleProfile.sub,
              ...(user.name ? { name: user.name } : {}),
            },
          })
        } else {
          await prisma.user.create({
            data: { email, name: user.name ?? null, googleSubject: googleProfile.sub },
          })
        }

        user.email = email
      }
      return true
    },
    // Point token.sub at OUR user id (Google would otherwise leave its own sub).
    jwt: async ({ token, account }) => {
      if (account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({
          where: { googleSubject: account.providerAccountId },
        })
        if (dbUser) token.sub = dbUser.id
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: resolveAuthSecret(process.env.NEXTAUTH_SECRET, process.env.NODE_ENV)
}
