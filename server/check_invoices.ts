import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: { customer: true }
  });
  console.log('--- INVOICES ---');
  console.log(JSON.stringify(invoices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
