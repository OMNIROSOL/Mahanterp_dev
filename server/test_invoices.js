const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const invoices = await prisma.invoice.findMany({
    include: { items: true, customer: true }
  });
  console.log(JSON.stringify(invoices.map(i => ({
    id: i.id,
    ref: i.reference,
    customer: i.customer?.name,
    items: i.items.map(it => ({ id: it.id, division: it.division, desc: it.description }))
  })), null, 2));
  prisma.$disconnect();
}
run();
