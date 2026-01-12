import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"
import { cache, cacheKeys, cacheTTL } from "@/lib/cache"
import { searchGames as searchITAD, getGameInfo as getITADGameInfo } from "@/lib/api/itad"

// Simple in-memory rate limiter (per user)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30 // max 30 requests per minute

function checkRateLimit(userId: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { limited: false }
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000)
    return { limited: true, retryAfter }
  }

  userLimit.count++
  return { limited: false }
}

// Sample game data for testing - later will integrate with IGDB API
// Videos are stored as JSON array of {name, youtubeId} objects
const sampleGames = [
  {
    provider: "IGDB",
    providerGameId: "100",
    name: "The Witcher 3: Wild Hunt",
    slug: "the-witcher-3-wild-hunt",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg",
    firstReleaseDate: new Date("2015-05-19"),
    genres: JSON.stringify(["Action", "RPG", "Adventure"]),
    platforms: JSON.stringify(["PC", "PlayStation 4", "Xbox One", "Nintendo Switch"]),
    gameModes: JSON.stringify(["Single player"]),
    playerCount: "1",
    videos: JSON.stringify([
      { name: "Official Launch Trailer", youtubeId: "c0i88t0Kacs" },
      { name: "The Sword of Destiny Trailer", youtubeId: "HtVdAasjOgU" }
    ]),
    description: "The Witcher 3: Wild Hunt is a story-driven open world RPG set in a visually stunning fantasy universe full of meaningful choices and impactful consequences."
  },
  {
    provider: "IGDB",
    providerGameId: "1",
    name: "The Legend of Zelda: Breath of the Wild",
    slug: "the-legend-of-zelda-breath-of-the-wild",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.jpg",
    firstReleaseDate: new Date("2017-03-03"),
    genres: JSON.stringify(["Action", "Adventure"]),
    platforms: JSON.stringify(["Nintendo Switch", "Wii U"]),
    gameModes: JSON.stringify(["Single player"]),
    playerCount: "1",
    videos: JSON.stringify([
      { name: "Nintendo Switch Presentation Trailer", youtubeId: "zw47_q9wbBE" },
      { name: "Life in the Ruins", youtubeId: "1rPxiXXxftE" }
    ]),
    description: "Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild."
  },
  {
    provider: "IGDB",
    providerGameId: "2",
    name: "Elden Ring",
    slug: "elden-ring",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
    firstReleaseDate: new Date("2022-02-25"),
    genres: JSON.stringify(["Action", "RPG"]),
    platforms: JSON.stringify(["PC", "PlayStation 5", "Xbox Series X"]),
    gameModes: JSON.stringify(["Single player", "Multiplayer", "Co-op"]),
    playerCount: "1-4 online",
    videos: JSON.stringify([
      { name: "Official Launch Trailer", youtubeId: "qqiC88f9ogU" },
      { name: "Official Gameplay Reveal", youtubeId: "JldMvQMO_5U" }
    ]),
    description: "Elden Ring is an action RPG developed by FromSoftware and published by Bandai Namco Entertainment."
  },
  {
    provider: "IGDB",
    providerGameId: "3",
    name: "Baldur's Gate 3",
    slug: "baldurs-gate-3",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5w0g.jpg",
    firstReleaseDate: new Date("2023-08-03"),
    genres: JSON.stringify(["RPG", "Strategy"]),
    platforms: JSON.stringify(["PC", "PlayStation 5", "Xbox Series X"]),
    gameModes: JSON.stringify(["Single player", "Multiplayer", "Co-op"]),
    playerCount: "1-4",
    videos: JSON.stringify([
      { name: "Launch Cinematic Trailer", youtubeId: "XuCfkgaaa08" },
      { name: "Official Release Trailer", youtubeId: "XWqP6aTxrpc" }
    ]),
    description: "An epic RPG from Larian Studios, set in the Dungeons & Dragons universe."
  },
  {
    provider: "IGDB",
    providerGameId: "4",
    name: "Hades",
    slug: "hades",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r0o.jpg",
    firstReleaseDate: new Date("2020-09-17"),
    genres: JSON.stringify(["Action", "Roguelike"]),
    platforms: JSON.stringify(["PC", "Nintendo Switch", "PlayStation", "Xbox"]),
    gameModes: JSON.stringify(["Single player"]),
    playerCount: "1",
    videos: JSON.stringify([
      { name: "v1.0 Launch Trailer", youtubeId: "91t0ha9x0AE" },
      { name: "Animated Trailer", youtubeId: "Bz8l935Bv0Y" }
    ]),
    description: "Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler."
  },
  {
    provider: "IGDB",
    providerGameId: "5",
    name: "Hollow Knight",
    slug: "hollow-knight",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg",
    firstReleaseDate: new Date("2017-02-24"),
    genres: JSON.stringify(["Action", "Platformer", "Metroidvania"]),
    platforms: JSON.stringify(["PC", "Nintendo Switch", "PlayStation", "Xbox"]),
    gameModes: JSON.stringify(["Single player"]),
    playerCount: "1",
    videos: JSON.stringify([
      { name: "Official Trailer", youtubeId: "UAO2urG23S4" },
      { name: "Nintendo Switch Trailer", youtubeId: "kWo5g-tsBNk" }
    ]),
    description: "Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes."
  },
  {
    provider: "IGDB",
    providerGameId: "6",
    name: "Celeste",
    slug: "celeste",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3byy.jpg",
    firstReleaseDate: new Date("2018-01-25"),
    genres: JSON.stringify(["Platformer", "Indie"]),
    platforms: JSON.stringify(["PC", "Nintendo Switch", "PlayStation", "Xbox"]),
    gameModes: JSON.stringify(["Single player"]),
    playerCount: "1",
    videos: JSON.stringify([
      { name: "Launch Trailer", youtubeId: "iofYDsA2rqg" }
    ]),
    description: "Help Madeline survive her inner demons on her journey to the top of Celeste Mountain."
  },
  {
    provider: "IGDB",
    providerGameId: "7",
    name: "God of War Ragnarök",
    slug: "god-of-war-ragnarok",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.jpg",
    firstReleaseDate: new Date("2022-11-09"),
    genres: JSON.stringify(["Action", "Adventure"]),
    platforms: JSON.stringify(["PlayStation 4", "PlayStation 5"]),
    gameModes: JSON.stringify(["Single player"]),
    playerCount: "1",
    videos: JSON.stringify([
      { name: "Launch Trailer", youtubeId: "hfJ4Km46A-0" },
      { name: "Father and Son Cinematic Trailer", youtubeId: "EE-4GvjKcfs" }
    ]),
    description: "Embark on a mythic journey for answers and allies before Ragnarök arrives."
  },
  {
    provider: "IGDB",
    providerGameId: "8",
    name: "Stardew Valley",
    slug: "stardew-valley",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/xrpmydnu9rpxvxfjkiu7.jpg",
    firstReleaseDate: new Date("2016-02-26"),
    genres: JSON.stringify(["Simulation", "RPG"]),
    platforms: JSON.stringify(["PC", "Nintendo Switch", "PlayStation", "Xbox", "Mobile"]),
    gameModes: JSON.stringify(["Single player", "Multiplayer", "Co-op"]),
    playerCount: "1-4",
    videos: JSON.stringify([
      { name: "Official Trailer", youtubeId: "ot7uXNQskhs" },
      { name: "Multiplayer Update Trailer", youtubeId: "AtL6X-4W0P8" }
    ]),
    description: "You've inherited your grandfather's old farm plot in Stardew Valley."
  }
]

// GET /api/games/search - Search for games
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(session.user.id)
    if (rateLimit.limited) {
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${rateLimit.retryAfter} seconds before searching again.`,
          retryAfter: rateLimit.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter)
          }
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase() || ""

    if (!query) {
      return NextResponse.json({ games: [], cached: false })
    }

    // Check cache first
    const cacheKey = cacheKeys.gameSearch(query)
    const cachedResult = await cache.get<{ games: unknown[] }>(cacheKey)

    if (cachedResult) {
      console.log(`[Cache HIT] Search query: "${query}"`)
      return NextResponse.json({
        games: cachedResult.games,
        cached: true,
        cacheKey
      })
    }

    console.log(`[Cache MISS] Search query: "${query}"`)

    // First, search local database (case-insensitive for SQLite using LIKE with % wildcards)
    // SQLite LIKE is case-insensitive for ASCII characters by default
    const localGames = await prisma.$queryRaw`
      SELECT id, provider, providerGameId, name, slug, description, coverUrl, bannerUrl,
             firstReleaseDate, genres, platforms, franchises, themes, gameModes, playerCount, rating
      FROM Game
      WHERE LOWER(name) LIKE ${`%${query.toLowerCase()}%`}
      LIMIT 20
    ` as any[]

    // If we have local results, cache and return them
    if (localGames.length > 0) {
      const games = localGames.map(game => ({
        id: game.id,
        providerGameId: game.providerGameId,
        name: game.name,
        coverUrl: game.coverUrl,
        firstReleaseDate: game.firstReleaseDate,
        genres: game.genres ? JSON.parse(game.genres) : [],
        platforms: game.platforms ? JSON.parse(game.platforms) : [],
        summary: game.description,
        isLocal: true
      }))

      // Cache the results
      await cache.set(cacheKey, { games }, cacheTTL.search)

      return NextResponse.json({ games, cached: false })
    }

    // Try searching ITAD API first for better results
    console.log(`[ITAD] Searching for: "${query}"`)
    const itadResults = await searchITAD(query, 20)

    if (itadResults && itadResults.length > 0) {
      console.log(`[ITAD] Found ${itadResults.length} results`)

      // Create games in database from ITAD results
      const games = await Promise.all(
        itadResults.slice(0, 20).map(async (itadGame) => {
          // Get additional info from ITAD
          const gameInfo = await getITADGameInfo(itadGame.id)

          const gameData = {
            provider: "ITAD",
            providerGameId: itadGame.id,
            name: itadGame.title,
            slug: itadGame.slug,
            coverUrl: gameInfo?.assets?.boxart || gameInfo?.assets?.banner400 || null,
            bannerUrl: gameInfo?.assets?.banner600 || null,
            firstReleaseDate: gameInfo?.released ? new Date(gameInfo.released) : null,
            genres: JSON.stringify(gameInfo?.tags?.slice(0, 5) || []),
            platforms: JSON.stringify(["PC"]), // ITAD primarily tracks PC games
            gameModes: JSON.stringify([]),
            playerCount: null,
            videos: JSON.stringify([]),
            description: null
          }

          // Upsert to database
          const game = await prisma.game.upsert({
            where: {
              provider_providerGameId: {
                provider: gameData.provider,
                providerGameId: gameData.providerGameId
              }
            },
            update: {
              name: gameData.name,
              coverUrl: gameData.coverUrl,
              bannerUrl: gameData.bannerUrl,
              firstReleaseDate: gameData.firstReleaseDate,
              genres: gameData.genres
            },
            create: gameData
          })

          return {
            id: game.id,
            providerGameId: game.providerGameId,
            name: game.name,
            coverUrl: game.coverUrl,
            firstReleaseDate: game.firstReleaseDate,
            genres: game.genres ? JSON.parse(game.genres) : [],
            platforms: game.platforms ? JSON.parse(game.platforms) : [],
            summary: game.description,
            isLocal: false,
            source: "ITAD"
          }
        })
      )

      // Cache the results
      await cache.set(cacheKey, { games }, cacheTTL.search)

      return NextResponse.json({ games, cached: false, source: "ITAD" })
    }

    // Fall back to sample data if ITAD returns no results
    console.log(`[ITAD] No results, falling back to sample data`)
    const matchingGames = sampleGames.filter(game =>
      game.name.toLowerCase().includes(query)
    )

    // Create games in database if they don't exist
    const games = await Promise.all(
      matchingGames.map(async (gameData) => {
        const game = await prisma.game.upsert({
          where: {
            provider_providerGameId: {
              provider: gameData.provider,
              providerGameId: gameData.providerGameId
            }
          },
          update: {},
          create: gameData
        })

        return {
          id: game.id,
          providerGameId: game.providerGameId,
          name: game.name,
          coverUrl: game.coverUrl,
          firstReleaseDate: game.firstReleaseDate,
          genres: game.genres ? JSON.parse(game.genres) : [],
          platforms: game.platforms ? JSON.parse(game.platforms) : [],
          summary: game.description,
          isLocal: false,
          source: "sample"
        }
      })
    )

    // Cache the results
    await cache.set(cacheKey, { games }, cacheTTL.search)

    return NextResponse.json({ games, cached: false, source: "sample" })
  } catch (error) {
    console.error("Error searching games:", error)
    return NextResponse.json(
      { error: "Failed to search games" },
      { status: 500 }
    )
  }
}
