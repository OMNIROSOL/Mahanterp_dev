require('ts-node').register();
const { prisma } = require('../index.ts');

async function checkDates() {
  const notes = await prisma.deliveryNote.findMany({
    select: { reference: true, deliveryDate: true, timestamp: true }
  });
  console.log(notes);
}

checkDates().catch(console.error).finally(() => prisma.$disconnect());
