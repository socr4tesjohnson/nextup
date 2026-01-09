import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/groups/[id]/dashboard - Get group dashboard data
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

    // First check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    // Get all member IDs in the group
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true }
    })
    const memberIds = members.map(m => m.userId)

    // Get "Now Playing" games - games with NOW_PLAYING status from group members
    const nowPlaying = await prisma.userGameEntry.findMany({
      where: {
        userId: { in: memberIds },
        status: "NOW_PLAYING"
      },
      include: {
        game: true,
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 10
    })

    // Get "Most Wanted" games - games on wishlists, aggregated by count
    const wishlistEntries = await prisma.userGameEntry.findMany({
      where: {
        userId: { in: memberIds },
        status: "WISHLIST"
      },
      include: {
        game: true,
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    // Aggregate wishlist entries by game
    const wishlistByGame = new Map<string, { game: any; users: any[]; count: number }>()
    for (const entry of wishlistEntries) {
      const gameId = entry.gameId
      if (!wishlistByGame.has(gameId)) {
        wishlistByGame.set(gameId, {
          game: entry.game,
          users: [],
          count: 0
        })
      }
      const item = wishlistByGame.get(gameId)!
      item.users.push(entry.user)
      item.count++
    }

    // Sort by count descending and take top 5
    const mostWanted = Array.from(wishlistByGame.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Get "Recently Added" - most recent entries from any status
    const recentlyAdded = await prisma.userGameEntry.findMany({
      where: {
        userId: { in: memberIds }
      },
      include: {
        game: true,
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })

    return NextResponse.json({
      nowPlaying,
      mostWanted,
      recentlyAdded
    })
  } catch (error) {
    console.error("Error fetching group dashboard:", error)
    return NextResponse.json(
      { error: "Failed to fetch group dashboard" },
      { status: 500 }
    )
  }
}
