import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const invoices = await prisma.invoices.findMany({
    include: { items: true }
  });

  for (const inv of invoices) {
    const total = inv.items.reduce((sum, it) => sum + Number(it.totalAmount), 0);
    console.log(`Invoice ${inv.reference} (${inv.id}): Stored Total: ${inv.grand_total}, Items Sum: ${total}, Items Count: ${inv.items.length}`);
    for (const item of inv.items) {
      console.log(`  - Item: ${item.description}, Qty: ${item.qty}, Price: ${item.unitPrice}, Total: ${item.totalAmount}`);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
