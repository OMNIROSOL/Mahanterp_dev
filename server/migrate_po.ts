import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate() {
  try {
    console.log('Adding tax_code and discount to purchase.purchase_order_items...');
    await prisma.$executeRaw`ALTER TABLE purchase.purchase_order_items ADD COLUMN IF NOT EXISTS tax_code text DEFAULT 'VAT 16%'`;
    await prisma.$executeRaw`ALTER TABLE purchase.purchase_order_items ADD COLUMN IF NOT EXISTS discount text DEFAULT ''`;
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
