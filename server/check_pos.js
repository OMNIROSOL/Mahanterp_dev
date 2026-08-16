const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.purchaseOrder.count();
    console.log('Total POs:', count);
    const orders = await prisma.purchaseOrder.findMany({
      take: 5,
      include: { items: true }
    });
    console.log('Last 5 orders:', JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
