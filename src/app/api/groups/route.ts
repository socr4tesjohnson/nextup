import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/groups - List user's groups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberships = await prisma.groupMember.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            owner: {
              select: { id: true, name: true, image: true }
            },
            members: {
              select: { userId: true, role: true }
            }
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    })

    const groups = memberships.map(m => ({
      ...m.group,
      memberCount: m.group.members.length,
      userRole: m.role,
      members: undefined
    }))

    return NextResponse.json({ groups })
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    )
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
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

    // Create group and add creator as admin member in a transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name: name.trim(),
          ownerId: session.user.id,
        }
      })

      // Add creator as admin member
      await tx.groupMember.create({
        data: {
          groupId: newGroup.id,
          userId: session.user.id,
          role: "ADMIN"
        }
      })

      return newGroup
    })

    return NextResponse.json({ group }, { status: 201 })
  } catch (error) {
    console.error("Error creating group:", error)
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    )
  }
}
