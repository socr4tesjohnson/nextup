import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/lists - Get current user's list entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = { userId: session.user.id }
    if (status) {
      where.status = status
    }

    const entries = await prisma.userGameEntry.findMany({
      where,
      include: {
        game: true,
        group: {
          select: { id: true, name: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Error fetching list entries:", error)
    return NextResponse.json(
      { error: "Failed to fetch list entries" },
      { status: 500 }
    )
  }
}

// POST /api/lists - Add game to list
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { gameId, status, platform, rating, notes, groupId, startedAt, finishedAt } = body

    if (!gameId || !status) {
      return NextResponse.json(
        { error: "gameId and status are required" },
        { status: 400 }
      )
    }

    const validStatuses = ["NOW_PLAYING", "FINISHED", "DROPPED", "BACKLOG", "WISHLIST", "FAVORITE"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    // Check if game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } })
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    // Check if entry already exists
    const existingEntry = await prisma.userGameEntry.findUnique({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId
        }
      }
    })

    if (existingEntry) {
      return NextResponse.json(
        { error: "This game is already in your list. You can update it from My Lists." },
        { status: 400 }
      )
    }

    // Verify group membership if groupId provided
    if (groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: session.user.id
          }
        }
      })
      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 403 }
        )
      }
    }

    const entry = await prisma.userGameEntry.create({
      data: {
        userId: session.user.id,
        gameId,
        status,
        platform: platform || null,
        rating: rating || null,
        notes: notes || null,
        groupId: groupId || null,
        startedAt: startedAt ? new Date(startedAt) : null,
        finishedAt: finishedAt ? new Date(finishedAt) : null,
      },
      include: {
        game: true
      }
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error("Error creating list entry:", error)
    return NextResponse.json(
      { error: "Failed to create list entry" },
      { status: 500 }
    )
  }
}
