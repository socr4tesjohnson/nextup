import { PrismaClient } from '@prisma/client'

async function addLongNameGame() {
  const prisma = new PrismaClient()

  try {
    // Create a game with a very long name to test truncation
    const longName = "Super Ultimate Championship Edition of the Greatest Fantasy Adventure Role-Playing Game Ever Created in the History of Video Games: Deluxe Anniversary Collection Remastered"

    const game = await prisma.game.upsert({
      where: {
        provider_providerGameId: {
          provider: 'IGDB',
          providerGameId: '999999'
        }
      },
      update: { name: longName },
      create: {
        provider: 'IGDB',
        providerGameId: '999999',
        name: longName,
        slug: 'super-long-name-test',
        coverUrl: null,
        firstReleaseDate: new Date('2024-01-01'),
        genres: JSON.stringify(['RPG', 'Adventure']),
        platforms: JSON.stringify(['PC', 'PlayStation 5']),
        description: 'A test game with an extremely long name to verify text truncation is working correctly in the UI.'
      }
    })
    console.log('Created/Updated game with long name:')
    console.log('  ID:', game.id)
    console.log('  Name:', game.name)
    console.log('  Name length:', game.name.length, 'characters')

    // Also get the current user to create an entry
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (user) {
      // Create an entry for this game
      const entry = await prisma.userGameEntry.upsert({
        where: {
          userId_gameId: {
            userId: user.id,
            gameId: game.id
          }
        },
        update: {
          status: 'BACKLOG',
          notes: 'Testing long title truncation'
        },
        create: {
          userId: user.id,
          gameId: game.id,
          status: 'BACKLOG',
          notes: 'Testing long title truncation'
        }
      })
      console.log('\nCreated game entry for test user:')
      console.log('  Entry ID:', entry.id)
      console.log('  Status:', entry.status)
    } else {
      console.log('\nNote: test@example.com user not found, no entry created')
    }

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

addLongNameGame()
