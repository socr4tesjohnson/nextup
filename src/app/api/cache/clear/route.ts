import { NextResponse } from "next/server"
import { cache } from "@/lib/cache"

// POST /api/cache/clear - Clear specific cache key (dev only)
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    const { key, pattern } = await request.json()

    if (pattern) {
      await cache.deletePattern(pattern)
      return NextResponse.json({ success: true, message: `Cleared cache pattern: ${pattern}` })
    }

    if (key) {
      await cache.delete(key)
      return NextResponse.json({ success: true, message: `Cleared cache key: ${key}` })
    }

    // Clear all game-related caches
    await cache.deletePattern("game:.*")
    return NextResponse.json({ success: true, message: "Cleared all game caches" })
  } catch (error) {
    console.error("Error clearing cache:", error)
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 })
  }
}
