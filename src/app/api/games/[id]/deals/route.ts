import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"
import { getDealsForGameTitle } from "@/lib/api/itad"

// GET /api/games/[id]/deals - Get deals for a game
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

    // First check if we have cached deals in our database
    const cachedDeals = await prisma.gameDeal.findMany({
      where: { gameId },
      orderBy: [
        { discountPercent: "desc" },
        { price: "asc" }
      ]
    })

    // If we have recent cached deals (less than 6 hours old), use them
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const hasRecentDeals = cachedDeals.length > 0 &&
      cachedDeals.some(d => d.fetchedAt > sixHoursAgo)

    if (hasRecentDeals) {
      return NextResponse.json({
        deals: cachedDeals.map(deal => ({
          id: deal.id,
          store: deal.store,
          price: deal.price,
          msrp: deal.msrp,
          discountPercent: deal.discountPercent,
          url: deal.url,
          isHistoricalLow: deal.isHistoricalLow,
          region: deal.region
        })),
        source: 'cache'
      })
    }

    // Get the game details
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json({ deals: [] })
    }

    // Check if ITAD API key is configured
    const itadApiKey = process.env.ITAD_API_KEY

    if (itadApiKey) {
      // Try to fetch real deals from IsThereAnyDeal
      try {
        const itadResult = await getDealsForGameTitle(game.name)

        if (itadResult.deals.length > 0) {
          const now = new Date()

          // Transform ITAD deals to our format
          const formattedDeals = itadResult.deals.map((deal, index) => ({
            id: `itad-${gameId}-${index}`,
            store: deal.store,
            price: deal.price,
            msrp: deal.msrp,
            discountPercent: deal.discountPercent,
            url: deal.url,
            isHistoricalLow: itadResult.historicalLow
              ? deal.price <= itadResult.historicalLow.price
              : false,
            region: "US",
            fetchedAt: now.toISOString()
          }))

          // Optionally cache the deals in our database for future requests
          // (This is a simplified version - in production you'd want upsert logic)
          // For now, we just return the fresh data

          // Safely handle the date - check if it's a valid date
          const histLowDate = itadResult.historicalLow?.date
          const validDate = histLowDate && !isNaN(histLowDate.getTime())
            ? histLowDate.toISOString()
            : undefined

          return NextResponse.json({
            deals: formattedDeals,
            historicalLow: itadResult.historicalLow ? {
              price: itadResult.historicalLow.price,
              store: itadResult.historicalLow.store,
              date: validDate
            } : undefined,
            source: 'itad'
          })
        }
      } catch (itadError) {
        console.error("ITAD API error:", itadError)
        // Fall through to mock data
      }
    }

    // Return mock data if ITAD API is not configured or returned no results
    const now = new Date()
    const mockDeals = [
      {
        id: `mock-steam-${gameId}`,
        store: "Steam",
        price: 29.99,
        msrp: 59.99,
        discountPercent: 50,
        url: `https://store.steampowered.com/app/${game.slug || gameId}`,
        isHistoricalLow: false,
        historicalLowPrice: 19.99,
        region: "US",
        fetchedAt: now.toISOString()
      },
      {
        id: `mock-gog-${gameId}`,
        store: "GOG",
        price: 24.99,
        msrp: 59.99,
        discountPercent: 58,
        url: `https://www.gog.com/game/${game.slug || gameId}`,
        isHistoricalLow: true,
        historicalLowPrice: 24.99,
        region: "US",
        fetchedAt: now.toISOString()
      },
      {
        id: `mock-epic-${gameId}`,
        store: "Epic Games",
        price: 34.99,
        msrp: 59.99,
        discountPercent: 42,
        url: `https://store.epicgames.com/p/${game.slug || gameId}`,
        isHistoricalLow: false,
        historicalLowPrice: 14.99,
        region: "US",
        fetchedAt: now.toISOString()
      },
      {
        id: `mock-humble-${gameId}`,
        store: "Humble Bundle",
        price: 31.99,
        msrp: 59.99,
        discountPercent: 47,
        url: `https://www.humblebundle.com/store/${game.slug || gameId}`,
        isHistoricalLow: false,
        historicalLowPrice: 29.99,
        region: "US",
        fetchedAt: now.toISOString()
      }
    ]

    // Mock price history data
    const mockPriceHistory = [
      { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), price: 59.99, store: "Steam" },
      { date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(), price: 44.99, store: "Steam" },
      { date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), price: 39.99, store: "GOG" },
      { date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), price: 29.99, store: "Steam" },
      { date: now.toISOString(), price: 24.99, store: "GOG" },
    ]

    return NextResponse.json({
      deals: mockDeals,
      priceHistory: mockPriceHistory,
      lowestEverPrice: 14.99,
      lowestEverStore: "Epic Games",
      isMockData: true
    })
  } catch (error) {
    console.error("Error fetching game deals:", error)
    return NextResponse.json(
      { error: "Failed to fetch game deals" },
      { status: 500 }
    )
  }
}
