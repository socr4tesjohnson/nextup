import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// Helper function to check if a game matches all filters (AND logic)
function matchesFilters(
  game: { genres?: string; platforms?: string; gameModes?: string },
  genreFilters: string[],
  platformFilters: string[],
  gameModeFilters: string[]
): boolean {
  const gameGenres = game.genres ? JSON.parse(game.genres).map((g: string) => g.toLowerCase()) : []
  const gamePlatforms = game.platforms ? JSON.parse(game.platforms).map((p: string) => p.toLowerCase()) : []
  const gameGameModes = game.gameModes ? JSON.parse(game.gameModes).map((m: string) => m.toLowerCase()) : []

  for (const genre of genreFilters) {
    if (!gameGenres.some((g: string) => g.includes(genre.toLowerCase()))) {
      return false
    }
  }

  for (const platform of platformFilters) {
    if (!gamePlatforms.some((p: string) => p.includes(platform.toLowerCase()))) {
      return false
    }
  }

  for (const mode of gameModeFilters) {
    if (!gameGameModes.some((m: string) => m.includes(mode.toLowerCase()))) {
      return false
    }
  }

  return true
}

// GET /api/games/filter - Filter games by genres, platforms, and game modes (AND logic)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase() || ""

    // Get filter parameters for AND search
    const genres = searchParams.get("genres")?.split(",").filter(Boolean) || []
    const platforms = searchParams.get("platforms")?.split(",").filter(Boolean) || []
    const gameModes = searchParams.get("gameModes")?.split(",").filter(Boolean) || []

    const hasFilters = genres.length > 0 || platforms.length > 0 || gameModes.length > 0

    if (!query && !hasFilters) {
      return NextResponse.json({ games: [], cached: false })
    }

    console.log(`[Filter] Query: "${query}", Filters: genres=${genres.join(",")}, platforms=${platforms.join(",")}, gameModes=${gameModes.join(",")}`)

    // Search all games in local database and filter by criteria
    let allGames: any[]

    if (query) {
      allGames = await prisma.$queryRaw`
        SELECT id, provider, providerGameId, name, slug, description, coverUrl, bannerUrl,
               firstReleaseDate, genres, platforms, franchises, themes, gameModes, playerCount, rating
        FROM Game
        WHERE LOWER(name) LIKE ${`%${query.toLowerCase()}%`}
        LIMIT 100
      ` as any[]
    } else {
      allGames = await prisma.$queryRaw`
        SELECT id, provider, providerGameId, name, slug, description, coverUrl, bannerUrl,
               firstReleaseDate, genres, platforms, franchises, themes, gameModes, playerCount, rating
        FROM Game
        LIMIT 100
      ` as any[]
    }

    // Apply AND filters if any
    let filteredGames = allGames
    if (hasFilters) {
      filteredGames = allGames.filter(game =>
        matchesFilters(game, genres, platforms, gameModes)
      )
    }

    const games = filteredGames.slice(0, 20).map(game => ({
      id: game.id,
      providerGameId: game.providerGameId,
      name: game.name,
      coverUrl: game.coverUrl,
      firstReleaseDate: game.firstReleaseDate,
      genres: game.genres ? JSON.parse(game.genres) : [],
      platforms: game.platforms ? JSON.parse(game.platforms) : [],
      gameModes: game.gameModes ? JSON.parse(game.gameModes) : [],
      summary: game.description,
      isLocal: true
    }))

    return NextResponse.json({
      games,
      cached: false,
      filters: { genres, platforms, gameModes },
      total: filteredGames.length
    })
  } catch (error) {
    console.error("Error filtering games:", error)
    return NextResponse.json(
      { error: "Failed to filter games" },
      { status: 500 }
    )
  }
}
