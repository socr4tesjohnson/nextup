import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// POST /api/groups/[id]/recommendations/[recId] - Dismiss a recommendation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; recId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id
    const recId = params.recId

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

    // Get the recommendation
    const recommendation = await prisma.groupRecommendation.findUnique({
      where: { id: recId }
    })

    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    if (recommendation.groupId !== groupId) {
      return NextResponse.json({ error: "Recommendation not in this group" }, { status: 403 })
    }

    // Add user to dismissedBy array
    const dismissedBy = JSON.parse(recommendation.dismissedBy || "[]") as string[]

    if (!dismissedBy.includes(session.user.id)) {
      dismissedBy.push(session.user.id)

      await prisma.groupRecommendation.update({
        where: { id: recId },
        data: {
          dismissedBy: JSON.stringify(dismissedBy)
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "Recommendation dismissed"
    })
  } catch (error) {
    console.error("Error dismissing recommendation:", error)
    return NextResponse.json(
      { error: "Failed to dismiss recommendation" },
      { status: 500 }
    )
  }
}
