import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Get all groups
  const groups = await prisma.group.findMany()

  if (groups.length === 0) {
    console.log("No groups found. Create a group first.")
    return
  }

  console.log(`Found ${groups.length} groups`)

  for (const group of groups) {
    await seedGroupRecommendations(group)
  }
}

async function seedGroupRecommendations(group: { id: string; name: string }) {
  console.log(`\nSeeding recommendations for group: ${group.name} (${group.id})`)

  // Get some games from the database
  const games = await prisma.game.findMany({
    take: 5
  })

  if (games.length === 0) {
    console.log("No games found. Add some games first.")
    return
  }

  // Delete existing recommendations for this group
  await prisma.groupRecommendation.deleteMany({
    where: { groupId: group.id }
  })

  // Create recommendations for each game
  const recommendations = games.map((game, index) => ({
    groupId: group.id,
    gameId: game.id,
    recommendationType: index % 2 === 0 ? "UPCOMING" : "TRENDING",
    score: 0.7 + (Math.random() * 0.3), // 70-100% match
    reason: getReasonForGame(game.name),
    dismissedBy: "[]"
  }))

  for (const rec of recommendations) {
    await prisma.groupRecommendation.create({
      data: rec
    })
    console.log(`  Created recommendation for: ${games.find(g => g.id === rec.gameId)?.name}`)
  }

  console.log(`  Created ${recommendations.length} recommendations for ${group.name}!`)
}

function getReasonForGame(name: string): string {
  const reasons = [
    "Based on games your group loves",
    "Similar to your group's favorites",
    "Matches your group's preferred genres",
    "Popular among groups with similar taste",
    "Recommended based on your wishlists"
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
