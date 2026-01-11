import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// POST /api/groups/[id]/leave - Leave a group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 400 }
      )
    }

    // Owners cannot leave their own group - they must delete it or transfer ownership
    if (group.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "Group owners cannot leave. Transfer ownership or delete the group instead." },
        { status: 400 }
      )
    }

    // Remove membership
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error leaving group:", error)
    return NextResponse.json(
      { error: "Failed to leave group" },
      { status: 500 }
    )
  }
}
