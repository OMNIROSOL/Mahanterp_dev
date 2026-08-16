import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const quotes = await prisma.salesQuote.findMany({
    include: {
      items: {
        include: {
          item: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(JSON.stringify(quotes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
