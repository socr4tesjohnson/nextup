import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"
import { cache, cacheKeys, cacheTTL } from "@/lib/cache"

// GET /api/games/[id] - Get game details
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

    // Check cache first
    const cacheKey = cacheKeys.gameDetail(gameId)
    const cachedResult = await cache.get<{ game: unknown }>(cacheKey)

    if (cachedResult) {
      console.log(`[Cache HIT] Game detail: "${gameId}"`)
      // Still need to check user's entry (not cached)
      const userEntry = await prisma.userGameEntry.findUnique({
        where: {
          userId_gameId: {
            userId: session.user.id,
            gameId
          }
        }
      })
      return NextResponse.json({
        game: cachedResult.game,
        userEntry: userEntry ? {
          id: userEntry.id,
          status: userEntry.status,
          platform: userEntry.platform,
          rating: userEntry.rating,
          notes: userEntry.notes,
          startedAt: userEntry.startedAt,
          finishedAt: userEntry.finishedAt,
          createdAt: userEntry.createdAt,
          updatedAt: userEntry.updatedAt
        } : null,
        cached: true
      })
    }

    console.log(`[Cache MISS] Game detail: "${gameId}"`)

    // Use raw query to get all fields including gameModes, playerCount, and videos
    // This bypasses any Prisma client caching issues
    const games = await prisma.$queryRaw<Array<{
      id: string
      name: string
      slug: string
      description: string | null
      coverUrl: string | null
      bannerUrl: string | null
      firstReleaseDate: Date | null
      genres: string
      platforms: string
      themes: string
      gameModes: string
      playerCount: string | null
      videos: string
      rating: number | null
    }>>`
      SELECT id, name, slug, description, coverUrl, bannerUrl, firstReleaseDate,
             genres, platforms, themes, gameModes, playerCount, videos, rating
      FROM Game
      WHERE id = ${gameId}
      LIMIT 1
    `

    const game = games[0]

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const gameData = {
      id: game.id,
      name: game.name,
      slug: game.slug,
      description: game.description,
      coverUrl: game.coverUrl,
      bannerUrl: game.bannerUrl,
      firstReleaseDate: game.firstReleaseDate,
      genres: game.genres ? JSON.parse(game.genres) : [],
      platforms: game.platforms ? JSON.parse(game.platforms) : [],
      themes: game.themes ? JSON.parse(game.themes) : [],
      gameModes: game.gameModes ? JSON.parse(game.gameModes) : [],
      playerCount: game.playerCount,
      videos: game.videos ? JSON.parse(game.videos) : [],
      rating: game.rating
    }

    // Cache the result (24 hours for game details)
    await cache.set(cacheKey, { game: gameData }, cacheTTL.gameDetail)

    // Fetch user's entry for this game (not cached - user-specific)
    const userEntry = await prisma.userGameEntry.findUnique({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId
        }
      }
    })

    return NextResponse.json({
      game: gameData,
      userEntry: userEntry ? {
        id: userEntry.id,
        status: userEntry.status,
        platform: userEntry.platform,
        rating: userEntry.rating,
        notes: userEntry.notes,
        startedAt: userEntry.startedAt,
        finishedAt: userEntry.finishedAt,
        createdAt: userEntry.createdAt,
        updatedAt: userEntry.updatedAt
      } : null,
      cached: false
    })
  } catch (error) {
    console.error("Error fetching game:", error)
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    )
  }
}
