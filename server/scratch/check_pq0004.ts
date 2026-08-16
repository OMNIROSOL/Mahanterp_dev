import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const quote = await prisma.purchaseQuote.findFirst({
    where: { reference: 'PQ-0004' },
    include: { items: true }
  });
  console.log('QUOTE:', JSON.stringify(quote, null, 2));
  process.exit(0);
}

check();
