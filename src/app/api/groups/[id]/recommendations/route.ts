import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/groups/[id]/recommendations - Get group recommendations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    // Get recommendations for this group, excluding ones dismissed by this user
    const recommendations = await prisma.groupRecommendation.findMany({
      where: {
        groupId
      },
      include: {
        game: true
      },
      orderBy: [
        { score: "desc" },
        { createdAt: "desc" }
      ],
      take: 20
    })

    // Filter out dismissed recommendations for this user
    const filteredRecommendations = recommendations.filter(rec => {
      const dismissedBy = JSON.parse(rec.dismissedBy || "[]") as string[]
      return !dismissedBy.includes(session.user.id)
    })

    // Format the response
    const formattedRecommendations = filteredRecommendations.map(rec => ({
      id: rec.id,
      score: rec.score,
      reason: rec.reason,
      recommendationType: rec.recommendationType,
      game: {
        id: rec.game.id,
        name: rec.game.name,
        coverUrl: rec.game.coverUrl,
        firstReleaseDate: rec.game.firstReleaseDate,
        platforms: rec.game.platforms ? JSON.parse(rec.game.platforms) : [],
        genres: rec.game.genres ? JSON.parse(rec.game.genres) : []
      }
    }))

    return NextResponse.json({
      recommendations: formattedRecommendations
    })
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    )
  }
}
