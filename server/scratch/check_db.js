
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- PURCHASE INVOICES (purchase.invoices) ---');
  const invs = await prisma.invoices.findMany({
    include: { suppliers: true }
  });
  console.log(`Found ${invs.length} purchase invoices.`);
  console.log(JSON.stringify(invs, null, 2));
  
  console.log('--- SALES INVOICES (sales.invoices) ---');
  const salesInvs = await prisma.invoice.findMany({
    include: { customer: true }
  });
  console.log(`Found ${salesInvs.length} sales invoices.`);

  console.log('--- SUPPLIERS (master.suppliers) ---');
  const suppliers = await prisma.suppliers.findMany();
  console.log(`Found ${suppliers.length} suppliers.`);
  if (suppliers.length > 0) {
    console.log('Sample supplier ID:', suppliers[0].id);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
