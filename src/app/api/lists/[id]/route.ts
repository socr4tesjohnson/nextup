import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/lists/[id] - Get a specific list entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const entry = await prisma.userGameEntry.findUnique({
      where: { id: params.id },
      include: {
        game: true,
        group: {
          select: { id: true, name: true }
        }
      }
    })

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    // Check ownership - user can only access their own entries
    if (entry.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to access this entry" },
        { status: 403 }
      )
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error("Error fetching list entry:", error)
    return NextResponse.json(
      { error: "Failed to fetch list entry" },
      { status: 500 }
    )
  }
}

// PATCH /api/lists/[id] - Update a list entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the entry first
    const entry = await prisma.userGameEntry.findUnique({
      where: { id: params.id }
    })

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    // Check ownership
    if (entry.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to modify this entry" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, platform, rating, notes, startedAt, finishedAt } = body

    const updateData: any = {}

    if (status !== undefined) {
      const validStatuses = ["NOW_PLAYING", "FINISHED", "DROPPED", "BACKLOG", "WISHLIST", "FAVORITE"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (platform !== undefined) updateData.platform = platform || null
    if (rating !== undefined) updateData.rating = rating || null
    if (notes !== undefined) updateData.notes = notes || null
    if (startedAt !== undefined) updateData.startedAt = startedAt ? new Date(startedAt) : null
    if (finishedAt !== undefined) updateData.finishedAt = finishedAt ? new Date(finishedAt) : null

    const updatedEntry = await prisma.userGameEntry.update({
      where: { id: params.id },
      data: updateData,
      include: {
        game: true
      }
    })

    return NextResponse.json({ entry: updatedEntry })
  } catch (error) {
    console.error("Error updating list entry:", error)
    return NextResponse.json(
      { error: "Failed to update list entry" },
      { status: 500 }
    )
  }
}

// DELETE /api/lists/[id] - Remove a list entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the entry first
    const entry = await prisma.userGameEntry.findUnique({
      where: { id: params.id }
    })

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    // Check ownership
    if (entry.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete this entry" },
        { status: 403 }
      )
    }

    await prisma.userGameEntry.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting list entry:", error)
    return NextResponse.json(
      { error: "Failed to delete list entry" },
      { status: 500 }
    )
  }
}
