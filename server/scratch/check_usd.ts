import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const suppliers = await prisma.suppliers.findMany({
    where: { currency: { contains: 'USD' } }
  });
  console.log('USD Suppliers:', suppliers.map(s => ({ id: s.id, name: s.name, currency: s.currency })));

  const usdInvoices = await prisma.invoices.findMany({
    where: { supplier_id: { in: suppliers.map(s => s.id) } },
    include: { items: true }
  });

  for (const inv of usdInvoices) {
    const total = inv.items.reduce((sum, it) => sum + Number(it.totalAmount), 0);
    console.log(`USD Invoice ${inv.reference}: Stored: ${inv.grand_total}, Items Sum: ${total}, Items Count: ${inv.items.length}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
