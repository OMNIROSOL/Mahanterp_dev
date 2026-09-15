const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ledgers = await prisma.stockLedger.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log("LAST 10 LEDGERS:", JSON.stringify(ledgers, null, 2));

  const grns = await prisma.goodsReceivedNote.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });
  console.log("LAST 3 GRNS:", JSON.stringify(grns, null, 2));
}

main().finally(() => prisma.$disconnect());
