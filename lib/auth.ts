import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { credentialStamp, matchesCredentialStamp } from "@/lib/session-credentials"
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
          select: { id: true, email: true, name: true, password: true, googleSubject: true },
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
          // Bind the exact credential that passed bcrypt, not a later DB read.
          credentialStamp: credentialStamp(user),
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

        const dbUser = existingUser
          ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              googleSubject: googleProfile.sub,
              ...(user.name ? { name: user.name } : {}),
            },
          })
          : await prisma.user.create({
            data: { email, name: user.name ?? null, googleSubject: googleProfile.sub },
          })

        user.id = dbUser.id
        user.credentialStamp = credentialStamp(dbUser)
        user.email = email
      }
      return true
    },
    jwt: async ({ token, user, account }) => {
      if (user && account) {
        token.sub = user.id
        token.credentialStamp = user.credentialStamp
      }
      // No legacy backfill or client update payload can renew revoked authority.
      if (!token.sub || typeof token.credentialStamp !== 'string') throw new Error('Session revoked')
      const current = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { id: true, password: true, googleSubject: true },
      })
      if (!current || !matchesCredentialStamp(token.credentialStamp, current)) throw new Error('Session revoked')
      // NextAuth v4 catches rejection, clears the cookie and returns no session.
      // A DB error must also propagate; never fall back to the stale token.
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
