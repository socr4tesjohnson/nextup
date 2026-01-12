import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/tier-lists/[id] - Get a specific tier list with all games
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tierListId = params.id

    // Get the tier list
    const tierLists = await prisma.$queryRaw<Array<{
      id: string
      name: string
      description: string | null
      userId: string | null
      groupId: string | null
      isPublic: number
      categories: string
      platforms: string
      gameModes: string
      createdAt: string
      updatedAt: string
    }>>`
      SELECT * FROM TierList WHERE id = ${tierListId}
    `

    if (tierLists.length === 0) {
      return NextResponse.json({ error: "Tier list not found" }, { status: 404 })
    }

    const tierList = tierLists[0]

    // Check access - must be owner or public
    const isOwner = tierList.userId === session.user.id
    const isPublic = tierList.isPublic === 1

    if (!isOwner && !isPublic) {
      // Check if user is member of the group (for group tier lists)
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

    // Get all games in this tier list with game details
    const games = await prisma.$queryRaw<Array<{
      id: string
      gameId: string
      tier: string
      position: number
      gameName: string
      coverUrl: string | null
    }>>`
      SELECT tlg.id, tlg.gameId, tlg.tier, tlg.position, g.name as gameName, g.coverUrl
      FROM TierListGame tlg
      JOIN Game g ON tlg.gameId = g.id
      WHERE tlg.tierListId = ${tierListId}
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

    // Group games by tier
    const tiers: Record<string, Array<{
      id: string
      gameId: string
      position: number
      game: { id: string; name: string; coverUrl: string | null }
    }>> = {
      S: [],
      A: [],
      B: [],
      C: [],
      D: [],
      F: [],
    }

    for (const game of games) {
      if (tiers[game.tier]) {
        tiers[game.tier].push({
          id: game.id,
          gameId: game.gameId,
          position: game.position,
          game: {
            id: game.gameId,
            name: game.gameName,
            coverUrl: game.coverUrl,
          },
        })
      }
    }

    return NextResponse.json({
      tierList: {
        ...tierList,
        isPublic: tierList.isPublic === 1,
        categories: JSON.parse(tierList.categories || "[]"),
        platforms: JSON.parse(tierList.platforms || "[]"),
        gameModes: JSON.parse(tierList.gameModes || "[]"),
        isOwner,
      },
      tiers,
    })
  } catch (error) {
    console.error("Error fetching tier list:", error)
    return NextResponse.json(
      { error: "Failed to fetch tier list" },
      { status: 500 }
    )
  }
}

// PATCH /api/tier-lists/[id] - Update tier list metadata
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

    // Get the tier list and verify ownership
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

    // Check ownership
    if (tierList.userId !== session.user.id) {
      // For group tier lists, check if user is a member
      if (tierList.groupId) {
        const membership = await prisma.$queryRaw<Array<{ role: string }>>`
          SELECT role FROM GroupMember WHERE groupId = ${tierList.groupId} AND userId = ${session.user.id}
        `
        if (membership.length === 0 || (membership[0].role !== "OWNER" && membership[0].role !== "ADMIN")) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const body = await request.json()
    const { name, description, isPublic, categories, platforms, gameModes } = body

    // Build update query
    const updates: string[] = []
    const values: unknown[] = []

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
      }
      if (name.length > 100) {
        return NextResponse.json({ error: "Name must be 100 characters or less" }, { status: 400 })
      }
    }

    // Sanitize category arrays
    const categoriesJson = categories !== undefined ? JSON.stringify(Array.isArray(categories) ? categories : []) : null
    const platformsJson = platforms !== undefined ? JSON.stringify(Array.isArray(platforms) ? platforms : []) : null
    const gameModesJson = gameModes !== undefined ? JSON.stringify(Array.isArray(gameModes) ? gameModes : []) : null

    await prisma.$executeRaw`
      UPDATE TierList
      SET
        name = COALESCE(${name !== undefined ? name.trim() : null}, name),
        description = CASE WHEN ${description !== undefined ? 1 : 0} = 1 THEN ${description || null} ELSE description END,
        isPublic = CASE WHEN ${isPublic !== undefined ? 1 : 0} = 1 THEN ${isPublic ? 1 : 0} ELSE isPublic END,
        categories = CASE WHEN ${categoriesJson !== null ? 1 : 0} = 1 THEN ${categoriesJson} ELSE categories END,
        platforms = CASE WHEN ${platformsJson !== null ? 1 : 0} = 1 THEN ${platformsJson} ELSE platforms END,
        gameModes = CASE WHEN ${gameModesJson !== null ? 1 : 0} = 1 THEN ${gameModesJson} ELSE gameModes END,
        updatedAt = datetime('now')
      WHERE id = ${tierListId}
    `

    const updated = await prisma.$queryRaw<Array<{
      id: string
      name: string
      description: string | null
      isPublic: number
      categories: string
      platforms: string
      gameModes: string
      updatedAt: string
    }>>`
      SELECT id, name, description, isPublic, categories, platforms, gameModes, updatedAt FROM TierList WHERE id = ${tierListId}
    `

    return NextResponse.json({
      tierList: {
        ...updated[0],
        isPublic: updated[0].isPublic === 1,
        categories: JSON.parse(updated[0].categories || "[]"),
        platforms: JSON.parse(updated[0].platforms || "[]"),
        gameModes: JSON.parse(updated[0].gameModes || "[]"),
      }
    })
  } catch (error) {
    console.error("Error updating tier list:", error)
    return NextResponse.json(
      { error: "Failed to update tier list" },
      { status: 500 }
    )
  }
}

// DELETE /api/tier-lists/[id] - Delete a tier list
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

    // Get the tier list and verify ownership
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

    // Check ownership
    if (tierList.userId !== session.user.id) {
      if (tierList.groupId) {
        const membership = await prisma.$queryRaw<Array<{ role: string }>>`
          SELECT role FROM GroupMember WHERE groupId = ${tierList.groupId} AND userId = ${session.user.id}
        `
        if (membership.length === 0 || membership[0].role !== "OWNER") {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Delete the tier list (cascade will delete games)
    await prisma.$executeRaw`DELETE FROM TierList WHERE id = ${tierListId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tier list:", error)
    return NextResponse.json(
      { error: "Failed to delete tier list" },
      { status: 500 }
    )
  }
}
