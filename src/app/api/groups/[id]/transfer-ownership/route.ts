import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// POST /api/groups/[id]/transfer-ownership - Transfer group ownership (owner only)
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
    const body = await request.json()
    const { newOwnerId } = body

    if (!newOwnerId) {
      return NextResponse.json(
        { error: "New owner ID is required" },
        { status: 400 }
      )
    }

    // Get the group
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if current user is the owner
    if (group.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the group owner can transfer ownership" },
        { status: 403 }
      )
    }

    // Cannot transfer to yourself
    if (newOwnerId === session.user.id) {
      return NextResponse.json(
        { error: "You are already the owner" },
        { status: 400 }
      )
    }

    // Check if new owner is a member of the group
    const newOwnerMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: newOwnerId
        }
      }
    })

    if (!newOwnerMembership) {
      return NextResponse.json(
        { error: "User is not a member of this group" },
        { status: 400 }
      )
    }

    // Transfer ownership in a transaction
    await prisma.$transaction([
      // Update the group owner
      prisma.group.update({
        where: { id: groupId },
        data: { ownerId: newOwnerId }
      }),
      // Make the new owner an admin (if not already)
      prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: newOwnerId
          }
        },
        data: { role: "ADMIN" }
      })
    ])

    // Get updated group info
    const updatedGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      group: updatedGroup
    })
  } catch (error) {
    console.error("Error transferring ownership:", error)
    return NextResponse.json(
      { error: "Failed to transfer ownership" },
      { status: 500 }
    )
  }
}
