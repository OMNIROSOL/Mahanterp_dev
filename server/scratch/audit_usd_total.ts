import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const invs = await prisma.invoices.findMany({
    include: { items: true, suppliers: true }
  });

  console.log('--- USD Invoices Audit ---');
  let totalVisible = 0;
  for (const i of invs) {
    const isUSD = (i.docOptions as any)?.currency === 'USD' || i.suppliers?.currency?.includes('USD');
    if (isUSD) {
      const itemsSum = i.items.reduce((s, it) => s + Number(it.totalAmount), 0);
      console.log(`Ref: ${i.reference}, ID: ${i.id.slice(0,8)}, Header: ${i.grand_total}, ItemsSum: ${itemsSum}, ItemCount: ${i.items.length}`);
      totalVisible += itemsSum;
    }
  }
  console.log('--- Total of Items (USD):', totalVisible);
}

check().catch(console.error).finally(() => prisma.$disconnect());
