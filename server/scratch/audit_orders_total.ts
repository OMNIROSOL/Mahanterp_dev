import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const orders = await prisma.purchaseOrder.findMany({
    include: { items: true, supplier: true }
  });

  console.log('--- Purchase Orders Audit ---');
  for (const o of orders) {
    const sum = o.items.reduce((s, it) => s + Number(it.totalAmount), 0);
    const cur = (o.docOptions as any)?.currency || o.supplier?.currency || 'ZMW';
    console.log(`Ref: ${o.reference}, Sum: ${sum}, Cur: ${cur}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
