import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const sales = await prisma.$queryRawUnsafe('SELECT reference, grand_total FROM sales.invoices WHERE grand_total::text LIKE \'%500.76%\'');
  const purchase = await prisma.$queryRawUnsafe('SELECT reference, grand_total FROM purchase.invoices WHERE grand_total::text LIKE \'%500.76%\'');
  console.log('Sales Match:', sales);
  console.log('Purchase Match:', purchase);
}

check().catch(console.error).finally(() => prisma.$disconnect());
