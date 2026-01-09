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

// GET /api/groups/[id]/settings - Get group settings (admin only)
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

    // Check if user is an admin
    const isAdmin = await checkAdmin(groupId, session.user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "You must be a group admin to access settings" },
        { status: 403 }
      )
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json({
      settings: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        defaultPlatforms: JSON.parse(group.defaultPlatforms),
        defaultRegion: group.defaultRegion,
        owner: group.owner,
        isOwner: group.ownerId === session.user.id
      }
    })
  } catch (error) {
    console.error("Error fetching group settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch group settings" },
      { status: 500 }
    )
  }
}
