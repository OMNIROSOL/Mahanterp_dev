import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    console.log('Testing connection...');
    // Test basic query
    const now = await prisma.$queryRaw`SELECT NOW()`;
    console.log('Current time from DB:', now);

    const columns: any = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'purchase' AND table_name = 'purchase_order_items'
    `;

    console.log('Columns in sales.quote_items:');
    console.table(columns);
    
    const ordersColumns: any = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'sales' AND table_name = 'sales_orders'
    `;
    console.log('Columns in sales.sales_orders:');
    console.table(ordersColumns);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
