import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/users/me/notifications - Get notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get notification preferences
    const preferences = await prisma.userNotificationPreference.findUnique({
      where: { userId: session.user.id }
    })

    if (!preferences) {
      // Return defaults if no preferences set
      return NextResponse.json({
        preferences: {
          dealAlerts: true,
          groupInvites: true,
          friendActivity: true,
          recommendations: true,
          emailNotifications: false
        }
      })
    }

    return NextResponse.json({
      preferences: {
        dealAlerts: preferences.dealAlerts,
        groupInvites: preferences.groupInvites,
        friendActivity: preferences.friendActivity,
        recommendations: preferences.recommendations,
        emailNotifications: preferences.emailNotifications
      }
    })
  } catch (error) {
    console.error("Error fetching notification preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    )
  }
}

// PATCH /api/users/me/notifications - Update notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { dealAlerts, groupInvites, friendActivity, recommendations, emailNotifications } = body

    // Upsert notification preferences
    const preferences = await prisma.userNotificationPreference.upsert({
      where: { userId: session.user.id },
      update: {
        dealAlerts: dealAlerts ?? undefined,
        groupInvites: groupInvites ?? undefined,
        friendActivity: friendActivity ?? undefined,
        recommendations: recommendations ?? undefined,
        emailNotifications: emailNotifications ?? undefined
      },
      create: {
        userId: session.user.id,
        dealAlerts: dealAlerts ?? true,
        groupInvites: groupInvites ?? true,
        friendActivity: friendActivity ?? true,
        recommendations: recommendations ?? true,
        emailNotifications: emailNotifications ?? false
      }
    })

    return NextResponse.json({
      preferences: {
        dealAlerts: preferences.dealAlerts,
        groupInvites: preferences.groupInvites,
        friendActivity: preferences.friendActivity,
        recommendations: preferences.recommendations,
        emailNotifications: preferences.emailNotifications
      }
    })
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    )
  }
}
