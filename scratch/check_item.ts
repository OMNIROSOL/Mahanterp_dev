import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.item.findFirst({
    where: { itemName: 'Spare Part DN12248' }
  });

  console.log(JSON.stringify(item, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
