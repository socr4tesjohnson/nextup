import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

// GET /api/users/me/deals - Get deal preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create deal preferences
    let preferences = await prisma.userDealPreference.findUnique({
      where: { userId: session.user.id }
    })

    if (!preferences) {
      // Return defaults if no preferences set
      return NextResponse.json({
        preferences: {
          enabled: false,
          region: "US",
          platforms: [],
          stores: [],
          priceThreshold: null,
          notifyOn: {}
        }
      })
    }

    return NextResponse.json({
      preferences: {
        enabled: preferences.enabled,
        region: preferences.region,
        platforms: JSON.parse(preferences.platforms),
        stores: JSON.parse(preferences.stores),
        priceThreshold: preferences.priceThreshold,
        notifyOn: JSON.parse(preferences.notifyOn)
      }
    })
  } catch (error) {
    console.error("Error fetching deal preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch deal preferences" },
      { status: 500 }
    )
  }
}

// PATCH /api/users/me/deals - Update deal preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { enabled, region, platforms, stores, priceThreshold, notifyOn } = body

    // Upsert deal preferences
    const preferences = await prisma.userDealPreference.upsert({
      where: { userId: session.user.id },
      update: {
        enabled: enabled ?? undefined,
        region: region ?? undefined,
        platforms: platforms ? JSON.stringify(platforms) : undefined,
        stores: stores ? JSON.stringify(stores) : undefined,
        priceThreshold: priceThreshold !== undefined ? priceThreshold : undefined,
        notifyOn: notifyOn ? JSON.stringify(notifyOn) : undefined
      },
      create: {
        userId: session.user.id,
        enabled: enabled ?? false,
        region: region ?? "US",
        platforms: JSON.stringify(platforms ?? []),
        stores: JSON.stringify(stores ?? []),
        priceThreshold: priceThreshold ?? null,
        notifyOn: JSON.stringify(notifyOn ?? {})
      }
    })

    return NextResponse.json({
      preferences: {
        enabled: preferences.enabled,
        region: preferences.region,
        platforms: JSON.parse(preferences.platforms),
        stores: JSON.parse(preferences.stores),
        priceThreshold: preferences.priceThreshold,
        notifyOn: JSON.parse(preferences.notifyOn)
      }
    })
  } catch (error) {
    console.error("Error updating deal preferences:", error)
    return NextResponse.json(
      { error: "Failed to update deal preferences" },
      { status: 500 }
    )
  }
}
