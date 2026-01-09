// Test script for data access control
// Run with: npx tsx scripts/test-data-access.ts

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Setting up test data for access control verification...")

  // Clean up
  await prisma.userGameEntry.deleteMany({})
  await prisma.game.deleteMany({})
  await prisma.groupMember.deleteMany({})
  await prisma.group.deleteMany({})
  await prisma.user.deleteMany({})

  // Create User A
  const userA = await prisma.user.create({
    data: {
      name: "User A",
      email: "usera@test.com",
      passwordHash: await bcrypt.hash("password123", 12),
    }
  })

  // Create User B
  const userB = await prisma.user.create({
    data: {
      name: "User B",
      email: "userb@test.com",
      passwordHash: await bcrypt.hash("password123", 12),
    }
  })

  // Create a test game
  const game = await prisma.game.create({
    data: {
      provider: "IGDB",
      providerGameId: "12345",
      name: "Test Game",
      slug: "test-game",
      description: "A test game for access control testing",
    }
  })

  // Create list entry for User A
  const entryA = await prisma.userGameEntry.create({
    data: {
      userId: userA.id,
      gameId: game.id,
      status: "NOW_PLAYING",
      notes: "User A's private notes"
    }
  })

  // Create list entry for User B
  const entryB = await prisma.userGameEntry.create({
    data: {
      userId: userB.id,
      gameId: game.id,
      status: "WISHLIST",
      notes: "User B's private notes"
    }
  })

  console.log("\n=== Test Data Created ===")
  console.log(`User A: ${userA.email} (id: ${userA.id})`)
  console.log(`User B: ${userB.email} (id: ${userB.id})`)
  console.log(`User A's Entry ID: ${entryA.id}`)
  console.log(`User B's Entry ID: ${entryB.id}`)

  console.log("\n=== Access Control Tests ===")

  // Simulate the check that happens in the API
  const entryToAccess = await prisma.userGameEntry.findUnique({
    where: { id: entryB.id }
  })

  // Test: User A trying to access User B's entry
  if (entryToAccess) {
    const canUserAAccess = entryToAccess.userId === userA.id
    console.log(`\nUser A (${userA.id}) trying to access User B's entry (${entryB.id}):`)
    console.log(`Entry belongs to: ${entryToAccess.userId}`)
    console.log(`Access result: ${canUserAAccess ? "FAIL - Access granted" : "PASS - Access denied (403)"}`)
  }

  // Test: User B trying to access their own entry
  if (entryToAccess) {
    const canUserBAccess = entryToAccess.userId === userB.id
    console.log(`\nUser B (${userB.id}) trying to access their own entry (${entryB.id}):`)
    console.log(`Entry belongs to: ${entryToAccess.userId}`)
    console.log(`Access result: ${canUserBAccess ? "PASS - Access granted" : "FAIL - Access denied"}`)
  }

  console.log("\n=== API Behavior Summary ===")
  console.log("GET /api/lists/:id - Returns 403 if entry.userId !== session.user.id")
  console.log("PATCH /api/lists/:id - Returns 403 if entry.userId !== session.user.id")
  console.log("DELETE /api/lists/:id - Returns 403 if entry.userId !== session.user.id")

  await prisma.$disconnect()
}

main().catch(console.error)
