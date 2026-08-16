import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const quotesCount = await prisma.salesQuote.count();
  const ordersCount = await prisma.salesOrder.count();
  const orders = await prisma.salesOrder.findMany({
    select: { id: true, reference: true, status: true, amount: true }
  });

  console.log('Quotes Count:', quotesCount);
  console.log('Orders Count:', ordersCount);
  console.log('Orders:', JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
