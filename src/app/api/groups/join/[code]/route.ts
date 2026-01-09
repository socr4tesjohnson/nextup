import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// POST /api/groups/join/[code] - Join group via invite code
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inviteCode = params.code

    // Find group by invite code
    const group = await prisma.group.findUnique({
      where: { inviteCode }
    })

    if (!group) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: session.user.id
        }
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this group", groupId: group.id },
        { status: 400 }
      )
    }

    // Add user as member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
        role: "MEMBER"
      }
    })

    return NextResponse.json({
      success: true,
      groupId: group.id,
      groupName: group.name
    })
  } catch (error) {
    console.error("Error joining group:", error)
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    )
  }
}
