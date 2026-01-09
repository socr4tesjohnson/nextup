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

// Generate a random invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// POST /api/groups/[id]/invite - Regenerate invite code (admin only)
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

    // Check if user is an admin
    const isAdmin = await checkAdmin(groupId, session.user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "You must be a group admin to regenerate the invite code" },
        { status: 403 }
      )
    }

    const newCode = generateInviteCode()

    const group = await prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newCode }
    })

    return NextResponse.json({
      inviteCode: group.inviteCode
    })
  } catch (error) {
    console.error("Error regenerating invite code:", error)
    return NextResponse.json(
      { error: "Failed to regenerate invite code" },
      { status: 500 }
    )
  }
}
