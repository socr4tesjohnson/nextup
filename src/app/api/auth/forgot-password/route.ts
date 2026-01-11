import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`)
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      })
    }

    // Delete any existing password reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    })

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex")

    // Token expires in 1 hour
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    // Store the token
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expires,
      },
    })

    // Build the reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    // In development, log the reset link to the console
    // In production, this would send an actual email
    console.log("===========================================")
    console.log("PASSWORD RESET LINK (Development Mode)")
    console.log("===========================================")
    console.log(`Email: ${normalizedEmail}`)
    console.log(`Reset URL: ${resetUrl}`)
    console.log(`Token expires: ${expires.toISOString()}`)
    console.log("===========================================")

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link.",
      // Include reset URL in development for easier testing
      ...(process.env.NODE_ENV === "development" && { resetUrl }),
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    )
  }
}
