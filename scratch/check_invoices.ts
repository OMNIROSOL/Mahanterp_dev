import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      reference: true,
      issueDate: true,
      dueDate: true,
      grandTotal: true
    }
  });
  console.log(JSON.stringify(invoices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
