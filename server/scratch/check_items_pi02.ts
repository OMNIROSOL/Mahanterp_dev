import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const items = await prisma.purchaseInvoiceItem.findMany({
    where: { invoiceId: '4369c0c8-2018-458c-94e8-b75f424e4384' }
  });
  console.log(items);
}

check().catch(console.error).finally(() => prisma.$disconnect());
