const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const locs = await prisma.location.findMany();
  console.log('Locations:', JSON.stringify(locs, null, 2));
}

run().finally(() => prisma.$disconnect());
