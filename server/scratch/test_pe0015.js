const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pes = await prisma.purchaseEnquiry.findMany({ 
    where: { reference: 'PE-0015' }, 
    include: { items: true }
  });
  console.log('PE-0015:', JSON.stringify(pes, null, 2));
}

run().finally(() => prisma.$disconnect());
