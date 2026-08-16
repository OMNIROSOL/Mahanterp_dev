
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const quoteCount = await prisma.salesQuote.count();
    const customerCount = await prisma.customer.count();
    const itemCount = await prisma.item.count();
    
    console.log(`Quotes: ${quoteCount}`);
    console.log(`Customers: ${customerCount}`);
    console.log(`Items: ${itemCount}`);

    const sampleQuote = await prisma.salesQuote.findFirst({
        include: { customer: true, items: true }
    });
    console.log('Sample Quote:', JSON.stringify(sampleQuote, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
