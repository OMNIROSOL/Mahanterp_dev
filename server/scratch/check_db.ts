import { prisma } from '../index';

async function main() {
  const items = await prisma.item.findMany();
  console.log('Items Count:', items.length);

  const suppliers = await prisma.suppliers.findMany();
  console.log('Suppliers Count:', suppliers.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
