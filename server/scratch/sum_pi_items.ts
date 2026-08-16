import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const items = await prisma.purchaseInvoiceItem.findMany();
  const sum = items.reduce((s, it) => s + Number(it.totalAmount), 0);
  console.log('Total PI Items Sum:', sum);
  for (const it of items) {
    console.log(`- Amount: ${it.totalAmount}, InvoiceId: ${it.invoiceId}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
