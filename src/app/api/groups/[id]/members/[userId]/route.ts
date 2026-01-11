import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// Helper function to check if user is an admin of the group
async function checkAdmin(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId
      }
    }
  })
  return member?.role === "ADMIN"
}

// DELETE /api/groups/[id]/members/[userId] - Remove member from group (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: groupId, userId: targetUserId } = params

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if current user is an admin
    const isAdmin = await checkAdmin(groupId, session.user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only group admins can remove members" },
        { status: 403 }
      )
    }

    // Cannot remove the owner
    if (targetUserId === group.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove the group owner" },
        { status: 400 }
      )
    }

    // Cannot remove yourself (use leave instead)
    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself. Use 'Leave Group' instead." },
        { status: 400 }
      )
    }

    // Check if target user is actually a member
    const targetMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId
        }
      }
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: "User is not a member of this group" },
        { status: 404 }
      )
    }

    // Remove the member
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
