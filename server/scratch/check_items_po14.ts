import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const items = await prisma.purchaseInvoiceItem.findMany({
    where: { invoiceId: 'a88ab443-9065-4f26-9a79-f94ae777c7d8' }
  });
  console.log(items);
}

check().catch(console.error).finally(() => prisma.$disconnect());
