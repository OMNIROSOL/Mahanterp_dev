const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const order = await prisma.salesOrder.findFirst({
    where: { reference: 'SO-0003' },
    include: { items: true }
  });
  console.log(JSON.stringify(order, null, 2));
  prisma.$disconnect();
}
run();
