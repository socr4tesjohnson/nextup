import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// Tier order for scoring similarity
const TIER_VALUES: Record<string, number> = {
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
}

// GET /api/tier-lists - Get user's tier lists or public tier lists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "my" // "my", "public", "similar"
    const groupId = searchParams.get("groupId")

    if (type === "my") {
      // Get user's own tier lists
      const tierLists = await prisma.$queryRaw<Array<{
        id: string
        name: string
        description: string | null
        userId: string | null
        groupId: string | null
        isPublic: number
        createdAt: string
        updatedAt: string
      }>>`
        SELECT id, name, description, userId, groupId, isPublic, createdAt, updatedAt
        FROM TierList
        WHERE userId = ${session.user.id}
        ORDER BY updatedAt DESC
      `

      // Get game counts for each tier list
      const tierListsWithGames = await Promise.all(
        tierLists.map(async (list) => {
          const games = await prisma.$queryRaw<Array<{
            id: string
            gameId: string
            tier: string
            position: number
          }>>`
            SELECT tlg.id, tlg.gameId, tlg.tier, tlg.position
            FROM TierListGame tlg
            WHERE tlg.tierListId = ${list.id}
            ORDER BY
              CASE tlg.tier
                WHEN 'S' THEN 1
                WHEN 'A' THEN 2
                WHEN 'B' THEN 3
                WHEN 'C' THEN 4
                WHEN 'D' THEN 5
                WHEN 'F' THEN 6
              END,
              tlg.position
          `
          return {
            ...list,
            isPublic: list.isPublic === 1,
            gameCount: games.length,
          }
        })
      )

      return NextResponse.json({ tierLists: tierListsWithGames })
    }

    if (type === "public") {
      // Get public tier lists (excluding user's own)
      const tierLists = await prisma.$queryRaw<Array<{
        id: string
        name: string
        description: string | null
        userId: string | null
        groupId: string | null
        isPublic: number
        createdAt: string
        updatedAt: string
        userName: string | null
      }>>`
        SELECT tl.id, tl.name, tl.description, tl.userId, tl.groupId, tl.isPublic,
               tl.createdAt, tl.updatedAt, u.name as userName
        FROM TierList tl
        LEFT JOIN User u ON tl.userId = u.id
        WHERE tl.isPublic = 1 AND (tl.userId != ${session.user.id} OR tl.userId IS NULL)
        ORDER BY tl.updatedAt DESC
        LIMIT 50
      `

      const tierListsWithGames = await Promise.all(
        tierLists.map(async (list) => {
          const gameCount = await prisma.$queryRaw<Array<{ count: number }>>`
            SELECT COUNT(*) as count FROM TierListGame WHERE tierListId = ${list.id}
          `
          return {
            ...list,
            isPublic: true,
            gameCount: gameCount[0]?.count || 0,
          }
        })
      )

      return NextResponse.json({ tierLists: tierListsWithGames })
    }

    if (type === "similar") {
      // Find users/groups with similar tier rankings
      const recommendations = await findSimilarUsers(session.user.id)
      return NextResponse.json({ recommendations })
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 })
  } catch (error) {
    console.error("Error fetching tier lists:", error)
    return NextResponse.json(
      { error: "Failed to fetch tier lists" },
      { status: 500 }
    )
  }
}

// POST /api/tier-lists - Create a new tier list
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, isPublic, groupId } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or less" }, { status: 400 })
    }

    // If groupId is provided, verify user is a member
    if (groupId) {
      const membership = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM GroupMember WHERE groupId = ${groupId} AND userId = ${session.user.id}
      `
      if (membership.length === 0) {
        return NextResponse.json({ error: "You must be a member of the group" }, { status: 403 })
      }
    }

    // Generate a unique ID
    const id = `tl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await prisma.$executeRaw`
      INSERT INTO TierList (id, name, description, userId, groupId, isPublic, createdAt, updatedAt)
      VALUES (${id}, ${name.trim()}, ${description || null}, ${groupId ? null : session.user.id}, ${groupId || null}, ${isPublic ? 1 : 0}, datetime('now'), datetime('now'))
    `

    const tierList = await prisma.$queryRaw<Array<{
      id: string
      name: string
      description: string | null
      userId: string | null
      groupId: string | null
      isPublic: number
      createdAt: string
      updatedAt: string
    }>>`
      SELECT * FROM TierList WHERE id = ${id}
    `

    return NextResponse.json({
      tierList: {
        ...tierList[0],
        isPublic: tierList[0].isPublic === 1,
        gameCount: 0,
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating tier list:", error)
    return NextResponse.json(
      { error: "Failed to create tier list" },
      { status: 500 }
    )
  }
}

// Helper function to find users with similar tier rankings
async function findSimilarUsers(userId: string) {
  // Get user's tier list games
  const userGames = await prisma.$queryRaw<Array<{
    gameId: string
    tier: string
  }>>`
    SELECT tlg.gameId, tlg.tier
    FROM TierListGame tlg
    JOIN TierList tl ON tlg.tierListId = tl.id
    WHERE tl.userId = ${userId}
  `

  if (userGames.length === 0) {
    return { users: [], groups: [] }
  }

  // Create a map of user's game tiers
  const userTierMap = new Map(userGames.map(g => [g.gameId, TIER_VALUES[g.tier] || 0]))

  // Get all public tier lists from other users
  const otherLists = await prisma.$queryRaw<Array<{
    tierListId: string
    userId: string | null
    groupId: string | null
    userName: string | null
    groupName: string | null
    gameId: string
    tier: string
  }>>`
    SELECT tl.id as tierListId, tl.userId, tl.groupId, u.name as userName, g.name as groupName,
           tlg.gameId, tlg.tier
    FROM TierList tl
    LEFT JOIN User u ON tl.userId = u.id
    LEFT JOIN "Group" g ON tl.groupId = g.id
    JOIN TierListGame tlg ON tlg.tierListId = tl.id
    WHERE tl.isPublic = 1 AND tl.userId != ${userId}
  `

  // Group by user/group and calculate similarity
  const similarities = new Map<string, {
    type: "user" | "group"
    id: string
    name: string
    score: number
    sharedGames: number
  }>()

  for (const item of otherLists) {
    const key = item.userId ? `user:${item.userId}` : `group:${item.groupId}`

    if (!similarities.has(key)) {
      similarities.set(key, {
        type: item.userId ? "user" : "group",
        id: (item.userId || item.groupId)!,
        name: (item.userName || item.groupName) || "Unknown",
        score: 0,
        sharedGames: 0,
      })
    }

    // Calculate similarity for shared games
    if (userTierMap.has(item.gameId)) {
      const userTier = userTierMap.get(item.gameId)!
      const otherTier = TIER_VALUES[item.tier] || 0
      const similarity = similarities.get(key)!

      // Score based on how close the tiers are (max 6 points per game for exact match)
      const tierDiff = Math.abs(userTier - otherTier)
      const gameScore = 6 - tierDiff // 6 for exact match, 0 for opposite ends

      similarity.score += gameScore
      similarity.sharedGames += 1
    }
  }

  // Convert to arrays and sort by score
  const results = Array.from(similarities.values())
    .filter(s => s.sharedGames >= 3) // Require at least 3 shared games
    .sort((a, b) => {
      // Normalize score by shared games for fair comparison
      const scoreA = a.score / a.sharedGames
      const scoreB = b.score / b.sharedGames
      return scoreB - scoreA
    })
    .slice(0, 10)

  return {
    users: results.filter(r => r.type === "user"),
    groups: results.filter(r => r.type === "group"),
  }
}
