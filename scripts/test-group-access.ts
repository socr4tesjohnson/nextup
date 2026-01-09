// Test script for group access control
// Run with: npx tsx scripts/test-group-access.ts

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Setting up test data...")

  // Clean up existing test data
  await prisma.groupMember.deleteMany({})
  await prisma.group.deleteMany({})
  await prisma.user.deleteMany({})

  // Create admin user
  const adminPasswordHash = await bcrypt.hash("password123", 12)
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@test.com",
      passwordHash: adminPasswordHash,
    }
  })
  console.log("Created admin user:", adminUser.id)

  // Create member user
  const memberPasswordHash = await bcrypt.hash("password123", 12)
  const memberUser = await prisma.user.create({
    data: {
      name: "Member User",
      email: "member@test.com",
      passwordHash: memberPasswordHash,
    }
  })
  console.log("Created member user:", memberUser.id)

  // Create a group with admin as owner
  const group = await prisma.group.create({
    data: {
      name: "Test Gaming Group",
      ownerId: adminUser.id,
      inviteCode: "TESTCODE",
    }
  })
  console.log("Created group:", group.id)

  // Add admin as ADMIN member
  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId: adminUser.id,
      role: "ADMIN"
    }
  })
  console.log("Added admin as ADMIN member")

  // Add member as regular MEMBER
  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId: memberUser.id,
      role: "MEMBER"
    }
  })
  console.log("Added member as MEMBER")

  console.log("\n=== Test Data Summary ===")
  console.log(`Admin User: ${adminUser.email} (id: ${adminUser.id})`)
  console.log(`Member User: ${memberUser.email} (id: ${memberUser.id})`)
  console.log(`Group: ${group.name} (id: ${group.id})`)
  console.log(`Invite Code: ${group.inviteCode}`)
  console.log("\nTest URLs:")
  console.log(`Group Page: http://localhost:3000/groups/${group.id}`)
  console.log(`Group Settings: http://localhost:3000/groups/${group.id}/settings`)
  console.log("\nTo test:")
  console.log("1. Login as admin@test.com - should see 'Group Settings' button")
  console.log("2. Login as member@test.com - should NOT see 'Group Settings' button")
  console.log("3. Try to access /groups/${group.id}/settings as member - should be redirected or get 403")

  await prisma.$disconnect()
}

main().catch(console.error)
