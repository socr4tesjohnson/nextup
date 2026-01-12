import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import DiscordProvider from "next-auth/providers/discord"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password")
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error("Invalid email or password")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id
        token.name = user.name
      }
      // Handle session update (when useSession().update() is called)
      if (trigger === "update" && session?.name) {
        token.name = session.name
      }

      // Save Discord connection data when signing in with Discord
      if (account?.provider === "discord" && user?.id) {
        try {
          await prisma.userDiscordConnection.upsert({
            where: { userId: user.id },
            update: {
              discordId: account.providerAccountId,
              discordUsername: user.name || "",
              discordAvatar: (user as any).image || null,
              accessToken: account.access_token || null,
              refreshToken: account.refresh_token || null,
              tokenExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
              isOnline: true,
              lastOnline: new Date(),
            },
            create: {
              userId: user.id,
              discordId: account.providerAccountId,
              discordUsername: user.name || "",
              discordAvatar: (user as any).image || null,
              accessToken: account.access_token || null,
              refreshToken: account.refresh_token || null,
              tokenExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
              isOnline: true,
              lastOnline: new Date(),
            },
          })
        } catch (error) {
          console.error("Failed to save Discord connection:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // Always get fresh name from token (which may have been updated)
        session.user.name = token.name as string
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      console.log("New user created:", user.email)
    },
  },
  debug: process.env.NODE_ENV === "development",
}
