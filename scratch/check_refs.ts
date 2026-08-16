import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const orders = await prisma.salesOrder.findMany({
    select: { reference: true }
  });
  console.log('Sales Order References:', JSON.stringify(orders, null, 2));

  const quotes = await prisma.salesQuote.findMany({
    select: { reference: true }
  });
  console.log('Sales Quote References:', JSON.stringify(quotes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
