import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

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

    // Get deals for this game
    const deals = await prisma.gameDeal.findMany({
      where: { gameId },
      orderBy: [
        { discountPercent: "desc" },
        { price: "asc" }
      ]
    })

    // If no deals exist, return some mock data for demonstration
    if (deals.length === 0) {
      // Get the game to show realistic mock data
      const game = await prisma.game.findUnique({
        where: { id: gameId }
      })

      if (!game) {
        return NextResponse.json({ deals: [] })
      }

      // Create mock deals for demonstration
      const mockDeals = [
        {
          id: `mock-steam-${gameId}`,
          store: "Steam",
          price: 29.99,
          msrp: 59.99,
          discountPercent: 50,
          url: `https://store.steampowered.com/app/${game.slug || gameId}`,
          isHistoricalLow: false,
          region: "US"
        },
        {
          id: `mock-gog-${gameId}`,
          store: "GOG",
          price: 24.99,
          msrp: 59.99,
          discountPercent: 58,
          url: `https://www.gog.com/game/${game.slug || gameId}`,
          isHistoricalLow: true,
          region: "US"
        },
        {
          id: `mock-epic-${gameId}`,
          store: "Epic Games",
          price: 34.99,
          msrp: 59.99,
          discountPercent: 42,
          url: `https://store.epicgames.com/p/${game.slug || gameId}`,
          isHistoricalLow: false,
          region: "US"
        },
        {
          id: `mock-humble-${gameId}`,
          store: "Humble Bundle",
          price: 31.99,
          msrp: 59.99,
          discountPercent: 47,
          url: `https://www.humblebundle.com/store/${game.slug || gameId}`,
          isHistoricalLow: false,
          region: "US"
        }
      ]

      return NextResponse.json({
        deals: mockDeals,
        isMockData: true
      })
    }

    return NextResponse.json({
      deals: deals.map(deal => ({
        id: deal.id,
        store: deal.store,
        price: deal.price,
        msrp: deal.msrp,
        discountPercent: deal.discountPercent,
        url: deal.url,
        isHistoricalLow: deal.isHistoricalLow,
        region: deal.region
      }))
    })
  } catch (error) {
    console.error("Error fetching game deals:", error)
    return NextResponse.json(
      { error: "Failed to fetch game deals" },
      { status: 500 }
    )
  }
}
