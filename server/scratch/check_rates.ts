import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const invs = await prisma.invoices.findMany();
  for (const i of invs) {
    const opts = i.docOptions as any;
    if (opts?.exchangeRate || opts?.rate) {
      console.log(`Ref: ${i.reference}, Rate: ${opts.exchangeRate || opts.rate}, Currency: ${opts.currency}`);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
