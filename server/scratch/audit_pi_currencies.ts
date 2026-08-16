import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const invs = await prisma.invoices.findMany({
    include: { suppliers: true, items: true }
  });

  for (const i of invs) {
    const cur = (i.docOptions as any)?.currency || i.suppliers?.currency?.split(' - ')[0] || 'ZMW';
    const itemsSum = i.items.reduce((s, it) => s + Number(it.totalAmount), 0);
    console.log(`Ref: ${i.reference}, Cur: ${cur}, ItemsSum: ${itemsSum}, Supplier: ${i.suppliers?.name}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
