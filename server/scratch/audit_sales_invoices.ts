import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const invoices = await prisma.invoice.findMany({
    include: { items: true }
  });

  for (const inv of invoices) {
    const total = (inv.items || []).reduce((sum, it) => sum + Number(it.totalAmount), 0);
    const cur = (inv.docOptions as any)?.currency || 'ZMW';
    console.log(`Sales Invoice ${inv.reference} (${inv.id}): Stored Total: ${inv.grandTotal}, Items Sum: ${total}, Items Count: ${inv.items.length}, Currency: ${cur}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
