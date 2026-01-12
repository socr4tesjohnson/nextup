import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"
import { cache, cacheKeys, cacheTTL } from "@/lib/cache"

// GET /api/games/[id]/similar - Get similar games based on genres and themes
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
    const cacheKey = `similar:${gameId}`
    const cachedResult = await cache.get<{ similarGames: unknown[] }>(cacheKey)

    if (cachedResult) {
      console.log(`[Cache HIT] Similar games for: "${gameId}"`)
      return NextResponse.json({
        similarGames: cachedResult.similarGames,
        cached: true
      })
    }

    console.log(`[Cache MISS] Similar games for: "${gameId}"`)

    // Get the current game
    const currentGame = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!currentGame) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    // Parse genres and themes from the current game
    const currentGenres: string[] = currentGame.genres ? JSON.parse(currentGame.genres) : []
    const currentThemes: string[] = currentGame.themes ? JSON.parse(currentGame.themes) : []
    const currentFranchises: string[] = currentGame.franchises ? JSON.parse(currentGame.franchises) : []

    // Find similar games - games that share genres, themes, or franchises
    const allGames = await prisma.game.findMany({
      where: {
        id: { not: gameId } // Exclude the current game
      },
      take: 100 // Limit to prevent performance issues
    })

    // Score games based on similarity
    const scoredGames = allGames.map(game => {
      const gameGenres: string[] = game.genres ? JSON.parse(game.genres) : []
      const gameThemes: string[] = game.themes ? JSON.parse(game.themes) : []
      const gameFranchises: string[] = game.franchises ? JSON.parse(game.franchises) : []

      let score = 0

      // Genre matches (highest weight)
      const genreMatches = currentGenres.filter(g => gameGenres.includes(g)).length
      score += genreMatches * 3

      // Theme matches (medium weight)
      const themeMatches = currentThemes.filter(t => gameThemes.includes(t)).length
      score += themeMatches * 2

      // Franchise matches (highest priority - same series)
      const franchiseMatches = currentFranchises.filter(f => gameFranchises.includes(f)).length
      score += franchiseMatches * 5

      return {
        game,
        score,
        matchedGenres: currentGenres.filter(g => gameGenres.includes(g)),
        matchedThemes: currentThemes.filter(t => gameThemes.includes(t)),
        matchedFranchises: currentFranchises.filter(f => gameFranchises.includes(f))
      }
    })

    // Sort by score and take top 6
    const similarGames = scoredGames
      .filter(sg => sg.score > 0) // Only include games with at least one match
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(sg => ({
        id: sg.game.id,
        name: sg.game.name,
        slug: sg.game.slug,
        coverUrl: sg.game.coverUrl,
        rating: sg.game.rating,
        genres: sg.game.genres ? JSON.parse(sg.game.genres) : [],
        matchReason: sg.matchedFranchises.length > 0
          ? `Same series: ${sg.matchedFranchises[0]}`
          : sg.matchedGenres.length > 0
            ? `Similar genre: ${sg.matchedGenres[0]}`
            : sg.matchedThemes.length > 0
              ? `Similar theme: ${sg.matchedThemes[0]}`
              : "Related"
      }))

    // Cache the result (1 hour for similar games)
    await cache.set(cacheKey, { similarGames }, 3600)

    return NextResponse.json({
      similarGames,
      cached: false
    })
  } catch (error) {
    console.error("Error fetching similar games:", error)
    return NextResponse.json(
      { error: "Failed to fetch similar games" },
      { status: 500 }
    )
  }
}
