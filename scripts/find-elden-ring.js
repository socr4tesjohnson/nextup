const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

p.$queryRaw`SELECT id, name FROM Game WHERE name LIKE '%Elden%'`
  .then(r => console.log(JSON.stringify(r)))
  .finally(() => p.$disconnect())
