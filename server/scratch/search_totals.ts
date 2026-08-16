import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const [piItems, salesItems, poItems] = await Promise.all([
    prisma.purchaseInvoiceItem.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.purchaseOrderItem.findMany()
  ]);

  console.log('--- Purchase Invoice Items ---');
  piItems.filter(i => Number(i.totalAmount) > 300).forEach(i => console.log(i));
  
  console.log('--- Sales Invoice Items ---');
  salesItems.filter(i => Number(i.totalAmount) > 300).forEach(i => console.log(i));

  console.log('--- Purchase Order Items ---');
  poItems.filter(i => Number(i.totalAmount) > 300).forEach(i => console.log(i));
}

check().catch(console.error).finally(() => prisma.$disconnect());
