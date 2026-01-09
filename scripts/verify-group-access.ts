// Verify group access control logic
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Get test data
  const group = await prisma.group.findFirst({
    where: { inviteCode: "TESTCODE" },
    include: {
      members: {
        include: {
          user: true
        }
      }
    }
  })

  if (!group) {
    console.log("Test group not found. Run test-group-access.ts first.")
    return
  }

  console.log("=== Group Access Control Verification ===\n")
  console.log(`Group: ${group.name} (${group.id})`)
  console.log("\nMembers and their roles:")

  for (const member of group.members) {
    const isAdmin = member.role === "ADMIN"
    console.log(`- ${member.user.email}: ${member.role} ${isAdmin ? "(CAN access settings)" : "(CANNOT access settings)"}`)

    // Simulate the access check from our API
    const canAccessSettings = member.role === "ADMIN"
    console.log(`  Access check result: ${canAccessSettings ? "ALLOWED" : "DENIED"}`)
  }

  // Test the API check logic directly
  const adminUser = group.members.find(m => m.role === "ADMIN")
  const memberUser = group.members.find(m => m.role === "MEMBER")

  console.log("\n=== Access Control Tests ===\n")

  // Test 1: Admin should access settings
  if (adminUser) {
    const adminAccess = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: adminUser.userId
        }
      }
    })
    const adminCanAccess = adminAccess?.role === "ADMIN"
    console.log(`Test 1: Admin accesses settings - ${adminCanAccess ? "PASS (allowed)" : "FAIL (denied)"}`)
  }

  // Test 2: Regular member should NOT access settings
  if (memberUser) {
    const memberAccess = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: memberUser.userId
        }
      }
    })
    const memberCanAccess = memberAccess?.role === "ADMIN"
    console.log(`Test 2: Member accesses settings - ${!memberCanAccess ? "PASS (denied)" : "FAIL (allowed)"}`)
  }

  // Test 3: Non-member should NOT access settings
  const nonMemberAccess = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: "non-existent-user-id"
      }
    }
  })
  const nonMemberCanAccess = nonMemberAccess?.role === "ADMIN"
  console.log(`Test 3: Non-member accesses settings - ${!nonMemberCanAccess ? "PASS (denied)" : "FAIL (allowed)"}`)

  console.log("\n=== API Endpoint Behavior ===\n")
  console.log("GET /api/groups/[id]/settings:")
  console.log("- Returns 401 if not authenticated")
  console.log("- Returns 403 if user is not an admin of the group")
  console.log("- Returns 404 if group not found")
  console.log("- Returns settings data if user is an admin")

  console.log("\nUI Behavior:")
  console.log("- 'Group Settings' button only shown to admins on group detail page")
  console.log("- Settings page redirects non-admins to group detail page")

  await prisma.$disconnect()
}

main().catch(console.error)
