const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const wos = await prisma.inventoryWriteOff.findMany();
  console.log('WRITE-OFFS IN DB:', wos.map(w => ({ id: w.id, reference: w.reference, status: w.status })));
  const single = await prisma.inventoryWriteOff.findUnique({
    where: { id: '67d39876-95a2-4dd7-9651-1bb6c41b41f5' }
  });
  console.log('QUERY FOR SPECIFIC ID:', single);
  await prisma.$disconnect();
  await pool.end();
}

run();
