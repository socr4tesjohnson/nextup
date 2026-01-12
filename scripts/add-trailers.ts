import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addTrailers() {
  // Update The Witcher 3 with video trailers
  const result = await prisma.game.updateMany({
    where: {
      name: {
        contains: 'Witcher 3'
      }
    },
    data: {
      videos: JSON.stringify([
        { name: "Official Launch Trailer", youtubeId: "c0i88t0Kacs" },
        { name: "The Sword of Destiny Trailer", youtubeId: "HtVdAasjOgU" }
      ])
    }
  })
  
  console.log(`Updated ${result.count} games with trailers`)
  
  // Also update other games
  const games = [
    { name: 'Zelda', videos: [
      { name: "Nintendo Switch Presentation Trailer", youtubeId: "zw47_q9wbBE" },
      { name: "Life in the Ruins", youtubeId: "1rPxiXXxftE" }
    ]},
    { name: 'Elden Ring', videos: [
      { name: "Official Launch Trailer", youtubeId: "qqiC88f9ogU" },
      { name: "Official Gameplay Reveal", youtubeId: "JldMvQMO_5U" }
    ]},
    { name: "Baldur's Gate", videos: [
      { name: "Launch Cinematic Trailer", youtubeId: "XuCfkgaaa08" },
      { name: "Official Release Trailer", youtubeId: "XWqP6aTxrpc" }
    ]},
    { name: 'Hades', videos: [
      { name: "v1.0 Launch Trailer", youtubeId: "91t0ha9x0AE" },
      { name: "Animated Trailer", youtubeId: "Bz8l935Bv0Y" }
    ]},
    { name: 'Hollow Knight', videos: [
      { name: "Official Trailer", youtubeId: "UAO2urG23S4" },
      { name: "Nintendo Switch Trailer", youtubeId: "kWo5g-tsBNk" }
    ]},
    { name: 'Celeste', videos: [
      { name: "Launch Trailer", youtubeId: "iofYDsA2rqg" }
    ]},
    { name: 'God of War', videos: [
      { name: "Launch Trailer", youtubeId: "hfJ4Km46A-0" },
      { name: "Father and Son Cinematic Trailer", youtubeId: "EE-4GvjKcfs" }
    ]},
    { name: 'Stardew Valley', videos: [
      { name: "Official Trailer", youtubeId: "ot7uXNQskhs" },
      { name: "Multiplayer Update Trailer", youtubeId: "AtL6X-4W0P8" }
    ]}
  ]

  for (const game of games) {
    const res = await prisma.game.updateMany({
      where: {
        name: {
          contains: game.name
        }
      },
      data: {
        videos: JSON.stringify(game.videos)
      }
    })
    console.log(`Updated ${res.count} games matching "${game.name}"`)
  }
  
  await prisma.$disconnect()
}

addTrailers()
