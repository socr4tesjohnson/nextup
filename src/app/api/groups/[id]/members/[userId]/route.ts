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

// PATCH /api/groups/[id]/members/[userId] - Update member role (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: groupId, userId: targetUserId } = params
    const body = await request.json()
    const { role } = body

    // Validate role
    if (!role || !["ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN or MEMBER" },
        { status: 400 }
      )
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Only the owner can change roles
    if (group.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the group owner can change member roles" },
        { status: 403 }
      )
    }

    // Cannot change the owner's role
    if (targetUserId === group.ownerId) {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 400 }
      )
    }

    // Cannot change your own role (owner can't demote themselves)
    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
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

    // Update the member's role
    const updatedMember = await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId
        }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      member: {
        id: updatedMember.id,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt,
        user: updatedMember.user
      }
    })
  } catch (error) {
    console.error("Error updating member role:", error)
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    )
  }
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
