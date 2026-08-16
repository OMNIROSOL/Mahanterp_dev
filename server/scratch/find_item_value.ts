import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const piItems = await prisma.purchaseInvoiceItem.findMany();
  piItems.forEach(it => {
    if (Math.abs(Number(it.totalAmount) - 500.76) < 0.01) console.log('Match PI Item:', it);
  });

  const salesItems = await prisma.invoiceItem.findMany();
  salesItems.forEach(it => {
    if (Math.abs(Number(it.totalAmount) - 500.76) < 0.01) console.log('Match Sales Item:', it);
  });

  const poItems = await prisma.purchaseOrderItem.findMany();
  poItems.forEach(it => {
    if (Math.abs(Number(it.totalAmount) - 500.76) < 0.01) console.log('Match PO Item:', it);
  });

  const soItems = await prisma.quoteItem.findMany();
  soItems.forEach(it => {
    if (Math.abs(Number(it.totalAmount) - 500.76) < 0.01) console.log('Match Sales Item:', it);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
