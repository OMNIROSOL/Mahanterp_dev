import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 10
  });
  console.log('Last 10 customer codes:', JSON.stringify(customers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
