import { prisma } from '../index';

async function checkData() {
  const itemsCount = await prisma.item.count();
  const suppliersCount = await prisma.suppliers.count();
  const salesCount = await prisma.invoiceItem.count();
  const incomingCount = await prisma.purchaseOrderItem.count();
  const poCount = await prisma.purchaseOrder.count();
  
  console.log(`Total items: ${itemsCount}`);
  console.log(`Total suppliers: ${suppliersCount}`);
  console.log(`Total invoice items (sales): ${salesCount}`);
  console.log(`Total PO items (incoming): ${incomingCount}`);
  console.log(`Total POs: ${poCount}`);
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
