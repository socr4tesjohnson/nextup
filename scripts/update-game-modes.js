// Script to update game modes in existing games
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const gameModesData = {
  // providerGameId -> { gameModes, playerCount }
  "100": { gameModes: ["Single player"], playerCount: "1" }, // The Witcher 3
  "1": { gameModes: ["Single player"], playerCount: "1" }, // Zelda BOTW
  "2": { gameModes: ["Single player", "Multiplayer", "Co-op"], playerCount: "1-4 online" }, // Elden Ring
  "3": { gameModes: ["Single player", "Multiplayer", "Co-op"], playerCount: "1-4" }, // Baldur's Gate 3
  "4": { gameModes: ["Single player"], playerCount: "1" }, // Hades
  "5": { gameModes: ["Single player"], playerCount: "1" }, // Hollow Knight
  "6": { gameModes: ["Single player"], playerCount: "1" }, // Celeste
  "7": { gameModes: ["Single player"], playerCount: "1" }, // God of War Ragnarok
  "8": { gameModes: ["Single player", "Multiplayer", "Co-op"], playerCount: "1-4" }, // Stardew Valley
}

async function main() {
  console.log('Updating game modes...')

  for (const [providerGameId, data] of Object.entries(gameModesData)) {
    try {
      const result = await prisma.game.updateMany({
        where: { providerGameId },
        data: {
          gameModes: JSON.stringify(data.gameModes),
          playerCount: data.playerCount
        }
      })
      console.log(`Updated providerGameId ${providerGameId}: ${result.count} record(s)`)
    } catch (error) {
      console.error(`Error updating ${providerGameId}:`, error.message)
    }
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
