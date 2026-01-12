import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

const VALID_TIERS = ["S", "A", "B", "C", "D", "F"]

// POST /api/tier-lists/[id]/games - Add a game to tier list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tierListId = params.id

    // Verify ownership
    const tierLists = await prisma.$queryRaw<Array<{
      id: string
      userId: string | null
      groupId: string | null
    }>>`
      SELECT id, userId, groupId FROM TierList WHERE id = ${tierListId}
    `

    if (tierLists.length === 0) {
      return NextResponse.json({ error: "Tier list not found" }, { status: 404 })
    }

    const tierList = tierLists[0]

    if (tierList.userId !== session.user.id) {
      if (tierList.groupId) {
        const membership = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM GroupMember WHERE groupId = ${tierList.groupId} AND userId = ${session.user.id}
        `
        if (membership.length === 0) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const body = await request.json()
    const { gameId, tier } = body

    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 })
    }

    if (!tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: "Valid tier is required (S, A, B, C, D, F)" }, { status: 400 })
    }

    // Check if game exists
    const games = await prisma.$queryRaw<Array<{ id: string; name: string; coverUrl: string | null }>>`
      SELECT id, name, coverUrl FROM Game WHERE id = ${gameId}
    `

    if (games.length === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    // Check if game is already in this tier list
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM TierListGame WHERE tierListId = ${tierListId} AND gameId = ${gameId}
    `

    if (existing.length > 0) {
      return NextResponse.json({ error: "Game is already in this tier list" }, { status: 400 })
    }

    // Get the next position for this tier
    const positions = await prisma.$queryRaw<Array<{ maxPos: number | null }>>`
      SELECT MAX(position) as maxPos FROM TierListGame WHERE tierListId = ${tierListId} AND tier = ${tier}
    `
    const nextPosition = (positions[0]?.maxPos || 0) + 1

    // Generate ID and insert
    const id = `tlg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await prisma.$executeRaw`
      INSERT INTO TierListGame (id, tierListId, gameId, tier, position, createdAt)
      VALUES (${id}, ${tierListId}, ${gameId}, ${tier}, ${nextPosition}, datetime('now'))
    `

    // Update tier list's updatedAt
    await prisma.$executeRaw`
      UPDATE TierList SET updatedAt = datetime('now') WHERE id = ${tierListId}
    `

    return NextResponse.json({
      entry: {
        id,
        gameId,
        tier,
        position: nextPosition,
        game: games[0],
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error adding game to tier list:", error)
    return NextResponse.json(
      { error: "Failed to add game to tier list" },
      { status: 500 }
    )
  }
}

// PATCH /api/tier-lists/[id]/games - Update game tier/position (batch)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tierListId = params.id

    // Verify ownership
    const tierLists = await prisma.$queryRaw<Array<{
      id: string
      userId: string | null
      groupId: string | null
    }>>`
      SELECT id, userId, groupId FROM TierList WHERE id = ${tierListId}
    `

    if (tierLists.length === 0) {
      return NextResponse.json({ error: "Tier list not found" }, { status: 404 })
    }

    const tierList = tierLists[0]

    if (tierList.userId !== session.user.id) {
      if (tierList.groupId) {
        const membership = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM GroupMember WHERE groupId = ${tierList.groupId} AND userId = ${session.user.id}
        `
        if (membership.length === 0) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const body = await request.json()
    const { updates } = body // Array of { gameId, tier, position }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 })
    }

    // Validate all updates
    for (const update of updates) {
      if (!update.gameId || typeof update.gameId !== "string") {
        return NextResponse.json({ error: "Each update must have a gameId" }, { status: 400 })
      }
      if (!update.tier || !VALID_TIERS.includes(update.tier)) {
        return NextResponse.json({ error: "Each update must have a valid tier" }, { status: 400 })
      }
      if (typeof update.position !== "number") {
        return NextResponse.json({ error: "Each update must have a position" }, { status: 400 })
      }
    }

    // Apply all updates
    for (const update of updates) {
      await prisma.$executeRaw`
        UPDATE TierListGame
        SET tier = ${update.tier}, position = ${update.position}
        WHERE tierListId = ${tierListId} AND gameId = ${update.gameId}
      `
    }

    // Update tier list's updatedAt
    await prisma.$executeRaw`
      UPDATE TierList SET updatedAt = datetime('now') WHERE id = ${tierListId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating tier list games:", error)
    return NextResponse.json(
      { error: "Failed to update tier list games" },
      { status: 500 }
    )
  }
}

// DELETE /api/tier-lists/[id]/games - Remove a game from tier list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tierListId = params.id

    // Verify ownership
    const tierLists = await prisma.$queryRaw<Array<{
      id: string
      userId: string | null
      groupId: string | null
    }>>`
      SELECT id, userId, groupId FROM TierList WHERE id = ${tierListId}
    `

    if (tierLists.length === 0) {
      return NextResponse.json({ error: "Tier list not found" }, { status: 404 })
    }

    const tierList = tierLists[0]

    if (tierList.userId !== session.user.id) {
      if (tierList.groupId) {
        const membership = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM GroupMember WHERE groupId = ${tierList.groupId} AND userId = ${session.user.id}
        `
        if (membership.length === 0) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get("gameId")

    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 })
    }

    await prisma.$executeRaw`
      DELETE FROM TierListGame WHERE tierListId = ${tierListId} AND gameId = ${gameId}
    `

    // Update tier list's updatedAt
    await prisma.$executeRaw`
      UPDATE TierList SET updatedAt = datetime('now') WHERE id = ${tierListId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing game from tier list:", error)
    return NextResponse.json(
      { error: "Failed to remove game from tier list" },
      { status: 500 }
    )
  }
}
