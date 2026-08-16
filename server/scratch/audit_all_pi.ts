import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const invs = await prisma.invoices.findMany({
    include: { items: true }
  });

  console.log('--- ALL Purchase Invoices ---');
  for (const i of invs) {
    const cur = (i.docOptions as any)?.currency || 'ZMW';
    const itemsSum = i.items.reduce((s, it) => s + Number(it.totalAmount), 0);
    console.log(`Ref: ${i.reference}, Cur: ${cur}, Header: ${i.grand_total}, ItemsSum: ${itemsSum}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
