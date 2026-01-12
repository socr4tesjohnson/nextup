import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/groups/[id]/discord - Get group Discord settings and member status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 }
      )
    }

    // Get group Discord settings
    const discordSettings = await prisma.groupDiscordSettings.findUnique({
      where: { groupId },
    })

    // Get all members with their Discord connections
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            discordConnection: {
              select: {
                discordUsername: true,
                discordAvatar: true,
                showDiscordStatus: true,
                isOnline: true,
                lastOnline: true,
                currentGame: true,
              },
            },
          },
        },
      },
    })

    // Format members with Discord status
    const membersWithDiscord = members.map((member) => {
      const discord = member.user.discordConnection
      const showStatus = discord?.showDiscordStatus ?? false

      return {
        id: member.user.id,
        name: member.user.name,
        image: member.user.image,
        role: member.role,
        discord: discord && showStatus
          ? {
              username: discord.discordUsername,
              avatar: discord.discordAvatar,
              isOnline: discord.isOnline,
              lastOnline: discord.lastOnline,
              currentGame: discord.currentGame,
            }
          : null,
      }
    })

    // Only include webhook URL for admins
    const isAdmin = membership.role === "ADMIN"

    return NextResponse.json({
      settings: discordSettings
        ? {
            webhookConfigured: !!discordSettings.webhookUrl,
            webhookUrl: isAdmin ? discordSettings.webhookUrl : undefined,
            channelId: discordSettings.channelId,
            serverId: discordSettings.serverId,
            enableWebhook: discordSettings.enableWebhook,
            notifyNewGames: discordSettings.notifyNewGames,
            notifyNowPlaying: discordSettings.notifyNowPlaying,
          }
        : null,
      members: membersWithDiscord,
    })
  } catch (error) {
    console.error("Failed to get group Discord settings:", error)
    return NextResponse.json(
      { error: "Failed to get group Discord settings" },
      { status: 500 }
    )
  }
}

// PATCH /api/groups/[id]/discord - Update group Discord settings (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id

    // Check if user is admin of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only group admins can update Discord settings" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      webhookUrl,
      channelId,
      serverId,
      enableWebhook,
      notifyNewGames,
      notifyNowPlaying,
    } = body

    // Validate webhook URL if provided
    if (webhookUrl && !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      return NextResponse.json(
        { error: "Invalid Discord webhook URL" },
        { status: 400 }
      )
    }

    const settings = await prisma.groupDiscordSettings.upsert({
      where: { groupId },
      update: {
        ...(typeof webhookUrl === "string" && { webhookUrl: webhookUrl || null }),
        ...(typeof channelId === "string" && { channelId: channelId || null }),
        ...(typeof serverId === "string" && { serverId: serverId || null }),
        ...(typeof enableWebhook === "boolean" && { enableWebhook }),
        ...(typeof notifyNewGames === "boolean" && { notifyNewGames }),
        ...(typeof notifyNowPlaying === "boolean" && { notifyNowPlaying }),
      },
      create: {
        groupId,
        webhookUrl: webhookUrl || null,
        channelId: channelId || null,
        serverId: serverId || null,
        enableWebhook: enableWebhook ?? false,
        notifyNewGames: notifyNewGames ?? true,
        notifyNowPlaying: notifyNowPlaying ?? true,
      },
    })

    return NextResponse.json({
      settings: {
        webhookConfigured: !!settings.webhookUrl,
        webhookUrl: settings.webhookUrl,
        channelId: settings.channelId,
        serverId: settings.serverId,
        enableWebhook: settings.enableWebhook,
        notifyNewGames: settings.notifyNewGames,
        notifyNowPlaying: settings.notifyNowPlaying,
      },
    })
  } catch (error) {
    console.error("Failed to update group Discord settings:", error)
    return NextResponse.json(
      { error: "Failed to update group Discord settings" },
      { status: 500 }
    )
  }
}

// POST /api/groups/[id]/discord - Test webhook
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id

    // Check if user is admin of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only group admins can test the webhook" },
        { status: 403 }
      )
    }

    const settings = await prisma.groupDiscordSettings.findUnique({
      where: { groupId },
    })

    if (!settings?.webhookUrl) {
      return NextResponse.json(
        { error: "No webhook URL configured" },
        { status: 400 }
      )
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    })

    // Send test message to webhook
    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "NextUp Integration Test",
            description: `This is a test message from **${group?.name || "your group"}** on NextUp.`,
            color: 0x6366f1, // Purple color matching NextUp theme
            timestamp: new Date().toISOString(),
            footer: {
              text: "NextUp - Track Games with Friends",
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Webhook test failed:", errorText)
      return NextResponse.json(
        { error: "Failed to send test message to Discord" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to test webhook:", error)
    return NextResponse.json(
      { error: "Failed to test webhook" },
      { status: 500 }
    )
  }
}
