import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function test() {
  const prisma = new PrismaClient()

  try {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testpass123', 10)
    const user = await prisma.user.upsert({
      where: { email: 'group-link-test@example.com' },
      update: {},
      create: {
        email: 'group-link-test@example.com',
        name: 'Group Link Tester',
        passwordHash: hashedPassword
      }
    })
    console.log('Test user:', user.id)

    // Create two test groups with this user as owner
    const group1 = await prisma.group.upsert({
      where: { inviteCode: 'TESTLINK1' },
      update: {},
      create: {
        name: 'Test Group Alpha',
        inviteCode: 'TESTLINK1',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        }
      },
      include: { members: true }
    })
    console.log('Group 1:', group1.id, group1.name)

    const group2 = await prisma.group.upsert({
      where: { inviteCode: 'TESTLINK2' },
      update: {},
      create: {
        name: 'Test Group Beta',
        inviteCode: 'TESTLINK2',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        }
      },
      include: { members: true }
    })
    console.log('Group 2:', group2.id, group2.name)

    console.log('\nExpected routes:')
    console.log('/groups/' + group1.id + ' -> Test Group Alpha')
    console.log('/groups/' + group2.id + ' -> Test Group Beta')

    // Verify the API returns these groups correctly
    const allGroups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId: user.id }
        }
      },
      include: {
        members: true,
        owner: true
      }
    })

    console.log('\nGroups in database for user:')
    allGroups.forEach(g => {
      console.log(`  - ${g.id}: ${g.name}`)
    })

    console.log('\n✓ Group cards will link to:')
    allGroups.forEach(g => {
      console.log(`  href="/groups/${g.id}" -> displays "${g.name}"`)
    })

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

test()
