const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.userGameEntry.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      game: { select: { name: true } }
    }
  });

  console.log('Current time:', new Date().toISOString());
  console.log('Database entries:');
  console.log(JSON.stringify(entries, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
