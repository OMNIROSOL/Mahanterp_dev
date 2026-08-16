const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  const notes = await prisma.deliveryNote.findMany({
    select: { reference: true, deliveryDate: true, timestamp: true }
  });
  console.log(notes);
}

checkDates().catch(console.error).finally(() => prisma.$disconnect());
