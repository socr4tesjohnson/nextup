// Script to check game modes in database
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Checking game modes in database...\n')

  const games = await prisma.$queryRaw`
    SELECT id, name, gameModes, playerCount
    FROM Game
    LIMIT 10
  `

  console.log('Games with gameModes and playerCount:')
  games.forEach(game => {
    console.log(`- ${game.name}:`)
    console.log(`  gameModes: ${game.gameModes}`)
    console.log(`  playerCount: ${game.playerCount}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
