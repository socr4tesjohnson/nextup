import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/games/[id]/group-statuses - Get group members' statuses for a game
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gameId = params.id

    // Get all groups the user is a member of
    const userMemberships = await prisma.groupMember.findMany({
      where: { userId: session.user.id },
      select: { groupId: true }
    })

    if (userMemberships.length === 0) {
      return NextResponse.json({ groupStatuses: [] })
    }

    const groupIds = userMemberships.map(m => m.groupId)

    // Get all members of these groups
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        },
        group: {
          select: { id: true, name: true }
        }
      }
    })

    // Get all member IDs (excluding current user)
    const memberIds = [...new Set(groupMembers.map(m => m.userId))]
      .filter(id => id !== session.user.id)

    if (memberIds.length === 0) {
      return NextResponse.json({ groupStatuses: [] })
    }

    // Get entries for this game from group members
    const entries = await prisma.userGameEntry.findMany({
      where: {
        gameId,
        userId: { in: memberIds }
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    // Fetch privacy preferences for all members
    let privacyPrefs: { userId: string; showActivityToGroup: number | boolean; showGameStatus: number | boolean; showRatings: number | boolean }[] = []
    try {
      privacyPrefs = await prisma.$queryRawUnsafe<{ userId: string; showActivityToGroup: number | boolean; showGameStatus: number | boolean; showRatings: number | boolean }[]>(`
        SELECT userId, showActivityToGroup, showGameStatus, showRatings
        FROM UserPrivacyPreference
        WHERE userId IN (${memberIds.map(() => '?').join(',')})
      `, ...memberIds)
    } catch {
      // Table might not exist yet, use defaults
    }

    // Create privacy map
    const privacyMap = new Map<string, { showActivityToGroup: boolean; showGameStatus: boolean; showRatings: boolean }>()
    for (const pref of privacyPrefs) {
      privacyMap.set(pref.userId, {
        showActivityToGroup: Boolean(pref.showActivityToGroup),
        showGameStatus: Boolean(pref.showGameStatus),
        showRatings: Boolean(pref.showRatings)
      })
    }

    const getPrivacy = (userId: string) => {
      return privacyMap.get(userId) || {
        showActivityToGroup: true,
        showGameStatus: true,
        showRatings: true
      }
    }

    // Filter entries based on privacy settings
    const visibleEntries = entries.filter(entry => {
      const privacy = getPrivacy(entry.userId)
      return privacy.showActivityToGroup && privacy.showGameStatus
    })

    // Map user to their groups
    const userGroupMap = new Map<string, { id: string; name: string }[]>()
    for (const member of groupMembers) {
      if (!userGroupMap.has(member.userId)) {
        userGroupMap.set(member.userId, [])
      }
      userGroupMap.get(member.userId)!.push({ id: member.group.id, name: member.group.name })
    }

    // Format response
    const groupStatuses = visibleEntries.map(entry => {
      const privacy = getPrivacy(entry.userId)
      return {
        user: {
          id: entry.user.id,
          name: entry.user.name,
          image: entry.user.image
        },
        status: entry.status,
        rating: privacy.showRatings ? entry.rating : null,
        platform: entry.platform,
        groups: userGroupMap.get(entry.userId) || []
      }
    })

    return NextResponse.json({ groupStatuses })
  } catch (error) {
    console.error("Error fetching group statuses:", error)
    return NextResponse.json(
      { error: "Failed to fetch group statuses" },
      { status: 500 }
    )
  }
}
