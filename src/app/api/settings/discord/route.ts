import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/settings/discord - Get user's Discord connection
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const discordConnection = await prisma.userDiscordConnection.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        discordId: true,
        discordUsername: true,
        discordAvatar: true,
        showDiscordStatus: true,
        syncNowPlaying: true,
        currentGame: true,
        isOnline: true,
        lastOnline: true,
        lastActivitySync: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      connected: !!discordConnection,
      connection: discordConnection,
    })
  } catch (error) {
    console.error("Failed to get Discord connection:", error)
    return NextResponse.json(
      { error: "Failed to get Discord connection" },
      { status: 500 }
    )
  }
}

// PATCH /api/settings/discord - Update Discord connection settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { showDiscordStatus, syncNowPlaying } = body

    const connection = await prisma.userDiscordConnection.findUnique({
      where: { userId: session.user.id },
    })

    if (!connection) {
      return NextResponse.json(
        { error: "Discord not connected" },
        { status: 404 }
      )
    }

    const updated = await prisma.userDiscordConnection.update({
      where: { userId: session.user.id },
      data: {
        ...(typeof showDiscordStatus === "boolean" && { showDiscordStatus }),
        ...(typeof syncNowPlaying === "boolean" && { syncNowPlaying }),
      },
      select: {
        id: true,
        discordId: true,
        discordUsername: true,
        discordAvatar: true,
        showDiscordStatus: true,
        syncNowPlaying: true,
        currentGame: true,
        isOnline: true,
        lastOnline: true,
      },
    })

    return NextResponse.json({ connection: updated })
  } catch (error) {
    console.error("Failed to update Discord settings:", error)
    return NextResponse.json(
      { error: "Failed to update Discord settings" },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/discord - Disconnect Discord
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if the user's only auth method is Discord
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    })

    const hasPassword = !!user?.passwordHash
    const hasOtherAuth =
      accounts.filter((a) => a.provider !== "discord").length > 0

    if (!hasPassword && !hasOtherAuth) {
      return NextResponse.json(
        {
          error:
            "Cannot disconnect Discord. You need another login method (password or Google) first.",
        },
        { status: 400 }
      )
    }

    // Delete Discord connection
    await prisma.userDiscordConnection.deleteMany({
      where: { userId: session.user.id },
    })

    // Remove Discord from linked accounts
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "discord",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to disconnect Discord:", error)
    return NextResponse.json(
      { error: "Failed to disconnect Discord" },
      { status: 500 }
    )
  }
}
