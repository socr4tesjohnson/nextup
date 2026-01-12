import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"

// POST /api/settings/discord/link - Get Discord OAuth URL for linking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientId = process.env.DISCORD_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: "Discord integration not configured" },
        { status: 503 }
      )
    }

    // Generate Discord OAuth URL for linking
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/discord`
    const scope = "identify email guilds"
    const state = Buffer.from(
      JSON.stringify({
        linkMode: true,
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString("base64")

    const authUrl = new URL("https://discord.com/api/oauth2/authorize")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", scope)
    authUrl.searchParams.set("state", state)

    return NextResponse.json({ url: authUrl.toString() })
  } catch (error) {
    console.error("Failed to generate Discord link URL:", error)
    return NextResponse.json(
      { error: "Failed to generate Discord link URL" },
      { status: 500 }
    )
  }
}
