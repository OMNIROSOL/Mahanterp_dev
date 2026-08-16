const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pes = await prisma.purchaseEnquiry.findMany({ 
    where: { items: { some: { qty: { gt: 0 } } } }, 
    include: { items: true },
    take: 5
  });
  console.log('PES:', JSON.stringify(pes, null, 2));
}

run().finally(() => prisma.$disconnect());
