const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const orders = await prisma.salesOrder.findMany({
    select: { reference: true }
  });
  console.log('All Sales Order References:', orders.map(o => o.reference));

  const quotes = await prisma.salesQuote.findMany({
    select: { reference: true }
  });
  console.log('All Sales Quote References:', quotes.map(q => q.reference));
}

main().catch(console.error).finally(() => prisma.$disconnect());
