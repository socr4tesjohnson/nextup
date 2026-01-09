import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function test() {
  const prisma = new PrismaClient()

  try {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testpass123', 10)
    const user = await prisma.user.upsert({
      where: { email: 'game-list-test@example.com' },
      update: {},
      create: {
        email: 'game-list-test@example.com',
        name: 'Game List Tester',
        passwordHash: hashedPassword
      }
    })
    console.log('Test user:', user.id)

    // Create a test game
    const game = await prisma.game.upsert({
      where: { igdbId: 999 },
      update: {},
      create: {
        igdbId: 999,
        name: 'Test Game for List Feature',
        coverUrl: null,
        firstReleaseDate: new Date('2024-01-01'),
        genres: JSON.stringify(['Test']),
        platforms: JSON.stringify(['PC']),
        summary: 'A test game for the list feature'
      }
    })
    console.log('Test game:', game.id, game.name)

    // Create a game entry
    const entry = await prisma.userGameEntry.upsert({
      where: {
        userId_gameId: {
          userId: user.id,
          gameId: game.id
        }
      },
      update: {
        status: 'NOW_PLAYING',
        notes: 'TEST_UNIQUE_12345'
      },
      create: {
        userId: user.id,
        gameId: game.id,
        status: 'NOW_PLAYING',
        notes: 'TEST_UNIQUE_12345'
      },
      include: { game: true }
    })
    console.log('Game entry created:', entry.id)
    console.log('  Status:', entry.status)
    console.log('  Notes:', entry.notes)
    console.log('  Game:', entry.game.name)

    // Verify the entry persists
    const fetchedEntry = await prisma.userGameEntry.findUnique({
      where: { id: entry.id },
      include: { game: true }
    })

    if (fetchedEntry) {
      console.log('\n✓ Entry persisted successfully!')
      console.log('  Notes match:', fetchedEntry.notes === 'TEST_UNIQUE_12345' ? 'YES' : 'NO')
    } else {
      console.log('\n✗ Entry not found after creation!')
    }

    // List all entries for user
    const allEntries = await prisma.userGameEntry.findMany({
      where: { userId: user.id },
      include: { game: true }
    })
    console.log(`\nUser has ${allEntries.length} game(s) in their list:`)
    allEntries.forEach(e => {
      console.log(`  - ${e.game.name} (${e.status}) - Notes: ${e.notes || 'none'}`)
    })

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

test()
