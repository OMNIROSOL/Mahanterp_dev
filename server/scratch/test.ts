require('ts-node').register();
const { prisma } = require('../index.ts');

async function run() {
  const customerId = 'fd51baef-2564-4d1a-823d-2083e29f41ac';
  console.log('Fetching customer...');
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  console.log('Customer:', customer);
  
  if (!customer) return;

  console.log('Fetching invoices...');
  const invoices = await prisma.invoice.findMany({ where: { customerId } });
  console.log('Invoices count:', invoices.length);

  console.log('Fetching receipts...');
  const receipts = await prisma.receipt.findMany({ where: { paidByContact: customer.name } });
  console.log('Receipts count:', receipts.length);
}

run().catch(console.error).finally(() => prisma.$disconnect());
