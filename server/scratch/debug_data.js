
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const customers = await prisma.customer.findMany({ take: 5 });
  const invoices = await prisma.invoice.findMany({ take: 5 });
  const receipts = await prisma.receipt.findMany({ take: 5 });

  console.log('--- CUSTOMERS ---');
  console.log(JSON.stringify(customers.map(c => ({ id: c.id, name: c.name, balance: c.balance })), null, 2));
  console.log('--- INVOICES ---');
  console.log(JSON.stringify(invoices.map(i => ({ customerId: i.customerId, grandTotal: i.grandTotal })), null, 2));
  console.log('--- RECEIPTS ---');
  console.log(JSON.stringify(receipts.map(r => ({ paidByContact: r.paidByContact, amount: r.amount })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
