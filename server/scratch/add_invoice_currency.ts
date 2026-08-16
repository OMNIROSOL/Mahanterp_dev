import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Adding column "currency" to sales.invoices...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZMW';
    `);
    console.log('Column added successfully.');

    console.log('Retroactively populating invoice currency based on customer currency...');
    const updatedCount = await prisma.$executeRawUnsafe(`
      UPDATE sales.invoices i
      SET currency = COALESCE(NULLIF(split_part(c.currency, ' - ', 1), ''), 'ZMW')
      FROM master.customers c
      WHERE i.customer_id = c.id;
    `);
    console.log(`Updated ${updatedCount} existing invoices.`);

    console.log('Verifying invoices after update:');
    const invoices: any = await prisma.$queryRawUnsafe(`
      SELECT i.id, i.reference, i.currency, c.name as customer_name
      FROM sales.invoices i
      JOIN master.customers c ON i.customer_id = c.id
      LIMIT 10;
    `);
    console.table(invoices);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

main();
