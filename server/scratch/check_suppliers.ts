import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const suppliers = await prisma.suppliers.findMany();
  for (const s of suppliers) {
    console.log(`Supplier: ${s.name}, Currency: ${s.currency}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
