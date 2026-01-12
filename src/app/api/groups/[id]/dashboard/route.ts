import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// Privacy preference interface
interface PrivacyPreference {
  userId: string
  showActivityToGroup: number | boolean
  showGameStatus: number | boolean
  showRatings: number | boolean
  showNotes: number | boolean
}

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

    // Fetch privacy preferences for all members
    let privacyPrefs: PrivacyPreference[] = []
    try {
      privacyPrefs = await prisma.$queryRawUnsafe<PrivacyPreference[]>(`
        SELECT userId, showActivityToGroup, showGameStatus, showRatings, showNotes
        FROM UserPrivacyPreference
        WHERE userId IN (${memberIds.map(() => '?').join(',')})
      `, ...memberIds)
    } catch {
      // Table might not exist yet, use defaults
    }

    // Create a map of userId -> privacy settings
    const privacyMap = new Map<string, {
      showActivityToGroup: boolean
      showGameStatus: boolean
      showRatings: boolean
      showNotes: boolean
    }>()

    for (const pref of privacyPrefs) {
      privacyMap.set(pref.userId, {
        showActivityToGroup: Boolean(pref.showActivityToGroup),
        showGameStatus: Boolean(pref.showGameStatus),
        showRatings: Boolean(pref.showRatings),
        showNotes: Boolean(pref.showNotes)
      })
    }

    // Default privacy settings for users without preferences
    const getPrivacy = (userId: string) => {
      return privacyMap.get(userId) || {
        showActivityToGroup: true,
        showGameStatus: true,
        showRatings: true,
        showNotes: false
      }
    }

    // Filter member IDs to only those who allow activity to be shown
    const visibleMemberIds = memberIds.filter(id => {
      // Always show current user's own activity
      if (id === session.user.id) return true
      return getPrivacy(id).showActivityToGroup
    })

    // Get "Now Playing" games - only from members who allow activity visibility
    const nowPlaying = await prisma.userGameEntry.findMany({
      where: {
        userId: { in: visibleMemberIds },
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

    // Get "Most Wanted" games - games on wishlists, aggregated by count (only from visible members)
    const wishlistEntries = await prisma.userGameEntry.findMany({
      where: {
        userId: { in: visibleMemberIds },
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

    // Get "Recently Added" - most recent entries from visible members only
    const recentlyAdded = await prisma.userGameEntry.findMany({
      where: {
        userId: { in: visibleMemberIds }
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

    // Parse platforms JSON and apply privacy filters for each entry
    const applyPrivacyFilters = (entry: any) => {
      const userPrivacy = getPrivacy(entry.userId)
      const isOwnEntry = entry.userId === session.user.id

      return {
        ...entry,
        // Only show rating if user allows it or it's their own entry
        rating: (isOwnEntry || userPrivacy.showRatings) ? entry.rating : null,
        // Only show notes if user allows it or it's their own entry
        notes: (isOwnEntry || userPrivacy.showNotes) ? entry.notes : null,
        // Only show status details if user allows it or it's their own entry
        status: (isOwnEntry || userPrivacy.showGameStatus) ? entry.status : entry.status,
        game: {
          ...entry.game,
          platforms: entry.game.platforms ? JSON.parse(entry.game.platforms) : []
        }
      }
    }

    return NextResponse.json({
      nowPlaying: nowPlaying.map(applyPrivacyFilters),
      mostWanted: mostWanted.map(item => ({
        ...item,
        game: {
          ...item.game,
          platforms: item.game.platforms ? JSON.parse(item.game.platforms) : []
        }
      })),
      recentlyAdded: recentlyAdded.map(applyPrivacyFilters)
    })
  } catch (error) {
    console.error("Error fetching group dashboard:", error)
    return NextResponse.json(
      { error: "Failed to fetch group dashboard" },
      { status: 500 }
    )
  }
}
