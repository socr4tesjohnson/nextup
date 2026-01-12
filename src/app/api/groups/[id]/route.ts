import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { compare } from "bcryptjs"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// Helper function to check if user is a member of the group
async function checkMembership(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId
      }
    }
  })
  return member
}

// Helper function to check if user is an admin of the group
async function checkAdmin(groupId: string, userId: string) {
  const member = await checkMembership(groupId, userId)
  return member?.role === "ADMIN"
}

// GET /api/groups/[id] - Get group details
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

    // First check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { joinedAt: "asc" }
        }
      }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if user is a member
    const membership = await checkMembership(groupId, session.user.id)
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    return NextResponse.json({
      group: {
        ...group,
        defaultPlatforms: group.defaultPlatforms ? JSON.parse(group.defaultPlatforms) : [],
        userRole: membership.role,
        isOwner: group.ownerId === session.user.id
      }
    })
  } catch (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    )
  }
}

// PATCH /api/groups/[id] - Update group (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id

    // Check if user is an admin
    const isAdmin = await checkAdmin(groupId, session.user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "You must be a group admin to update settings" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, defaultPlatforms, defaultRegion } = body

    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Group name is required" },
          { status: 400 }
        )
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: "Group name must be less than 100 characters" },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (defaultPlatforms !== undefined) {
      updateData.defaultPlatforms = JSON.stringify(defaultPlatforms)
    }

    if (defaultRegion !== undefined) {
      updateData.defaultRegion = defaultRegion
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData
    })

    return NextResponse.json({ group })
  } catch (error) {
    console.error("Error updating group:", error)
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    )
  }
}

// DELETE /api/groups/[id] - Delete group (owner only, requires password)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groupId = params.id

    // Parse request body for password
    let password: string | undefined
    try {
      const body = await request.json()
      password = body.password
    } catch {
      return NextResponse.json(
        { error: "Password is required to delete a group" },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete a group" },
        { status: 400 }
      )
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true }
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Unable to verify password" },
        { status: 400 }
      )
    }

    // Verify password
    const isValidPassword = await compare(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      )
    }

    // Check if user is the owner
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the group owner can delete the group" },
        { status: 403 }
      )
    }

    // Delete group (cascades to members due to onDelete: Cascade)
    await prisma.group.delete({
      where: { id: groupId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting group:", error)
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    )
  }
}
