import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

interface PrivacyPreference {
  id: string
  userId: string
  showActivityToGroup: number | boolean
  showGameStatus: number | boolean
  showRatings: number | boolean
  showNotes: number | boolean
  showOnlineStatus: number | boolean
  allowGroupInvites: number | boolean
}

// Ensure the table exists
async function ensureTableExists() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS UserPrivacyPreference (
        id TEXT PRIMARY KEY NOT NULL,
        userId TEXT UNIQUE NOT NULL,
        showActivityToGroup INTEGER NOT NULL DEFAULT 1,
        showGameStatus INTEGER NOT NULL DEFAULT 1,
        showRatings INTEGER NOT NULL DEFAULT 1,
        showNotes INTEGER NOT NULL DEFAULT 0,
        showOnlineStatus INTEGER NOT NULL DEFAULT 1,
        allowGroupInvites INTEGER NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `)
  } catch (error) {
    // Table might already exist, that's fine
    console.log("Table check completed")
  }
}

// GET /api/users/me/privacy - Get privacy preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureTableExists()

    // Get privacy preferences using raw query
    const results = await prisma.$queryRawUnsafe<PrivacyPreference[]>(`
      SELECT * FROM UserPrivacyPreference WHERE userId = ?
    `, session.user.id)

    if (!results || results.length === 0) {
      // Return defaults if no preferences set
      return NextResponse.json({
        preferences: {
          showActivityToGroup: true,
          showGameStatus: true,
          showRatings: true,
          showNotes: false,
          showOnlineStatus: true,
          allowGroupInvites: true
        }
      })
    }

    const prefs = results[0]
    return NextResponse.json({
      preferences: {
        showActivityToGroup: Boolean(prefs.showActivityToGroup),
        showGameStatus: Boolean(prefs.showGameStatus),
        showRatings: Boolean(prefs.showRatings),
        showNotes: Boolean(prefs.showNotes),
        showOnlineStatus: Boolean(prefs.showOnlineStatus),
        allowGroupInvites: Boolean(prefs.allowGroupInvites)
      }
    })
  } catch (error) {
    console.error("Error fetching privacy preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch privacy preferences" },
      { status: 500 }
    )
  }
}

// PATCH /api/users/me/privacy - Update privacy preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureTableExists()

    const body = await request.json()
    const {
      showActivityToGroup,
      showGameStatus,
      showRatings,
      showNotes,
      showOnlineStatus,
      allowGroupInvites
    } = body

    // Check if preferences exist
    const existing = await prisma.$queryRawUnsafe<PrivacyPreference[]>(`
      SELECT * FROM UserPrivacyPreference WHERE userId = ?
    `, session.user.id)

    const now = new Date().toISOString()

    if (existing && existing.length > 0) {
      // Update existing
      await prisma.$executeRawUnsafe(`
        UPDATE UserPrivacyPreference SET
          showActivityToGroup = ?,
          showGameStatus = ?,
          showRatings = ?,
          showNotes = ?,
          showOnlineStatus = ?,
          allowGroupInvites = ?,
          updatedAt = ?
        WHERE userId = ?
      `,
        showActivityToGroup !== undefined ? (showActivityToGroup ? 1 : 0) : existing[0].showActivityToGroup,
        showGameStatus !== undefined ? (showGameStatus ? 1 : 0) : existing[0].showGameStatus,
        showRatings !== undefined ? (showRatings ? 1 : 0) : existing[0].showRatings,
        showNotes !== undefined ? (showNotes ? 1 : 0) : existing[0].showNotes,
        showOnlineStatus !== undefined ? (showOnlineStatus ? 1 : 0) : existing[0].showOnlineStatus,
        allowGroupInvites !== undefined ? (allowGroupInvites ? 1 : 0) : existing[0].allowGroupInvites,
        now,
        session.user.id
      )
    } else {
      // Create new
      const id = `priv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      await prisma.$executeRawUnsafe(`
        INSERT INTO UserPrivacyPreference (id, userId, showActivityToGroup, showGameStatus, showRatings, showNotes, showOnlineStatus, allowGroupInvites, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        id,
        session.user.id,
        showActivityToGroup !== undefined ? (showActivityToGroup ? 1 : 0) : 1,
        showGameStatus !== undefined ? (showGameStatus ? 1 : 0) : 1,
        showRatings !== undefined ? (showRatings ? 1 : 0) : 1,
        showNotes !== undefined ? (showNotes ? 1 : 0) : 0,
        showOnlineStatus !== undefined ? (showOnlineStatus ? 1 : 0) : 1,
        allowGroupInvites !== undefined ? (allowGroupInvites ? 1 : 0) : 1,
        now,
        now
      )
    }

    // Fetch updated preferences
    const updated = await prisma.$queryRawUnsafe<PrivacyPreference[]>(`
      SELECT * FROM UserPrivacyPreference WHERE userId = ?
    `, session.user.id)

    const prefs = updated[0]
    return NextResponse.json({
      preferences: {
        showActivityToGroup: Boolean(prefs.showActivityToGroup),
        showGameStatus: Boolean(prefs.showGameStatus),
        showRatings: Boolean(prefs.showRatings),
        showNotes: Boolean(prefs.showNotes),
        showOnlineStatus: Boolean(prefs.showOnlineStatus),
        allowGroupInvites: Boolean(prefs.allowGroupInvites)
      }
    })
  } catch (error) {
    console.error("Error updating privacy preferences:", error)
    return NextResponse.json(
      { error: "Failed to update privacy preferences" },
      { status: 500 }
    )
  }
}
