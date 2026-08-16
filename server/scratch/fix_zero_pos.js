require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixZeroAmountPOs() {
  const pos = await prisma.purchaseOrder.findMany({
    where: { amount: { lte: 0 } },
    include: { items: true }
  });

  console.log(`Found ${pos.length} Purchase Orders with zero or negative amount.`);

  for (const po of pos) {
    if (po.items && po.items.length > 0) {
      let calculatedAmount = 0;
      let itemsUpdated = false;

      for (const item of po.items) {
        let itemTotal = Number(item.totalAmount || 0);
        if (itemTotal === 0 && Number(item.qty || 0) > 0 && Number(item.unitPrice || 0) > 0) {
          itemTotal = Number(item.qty) * Number(item.unitPrice);
          await prisma.purchaseOrderItem.update({
            where: { id: item.id },
            data: { totalAmount: itemTotal }
          });
          itemsUpdated = true;
        }
        calculatedAmount += itemTotal;
      }

      if (calculatedAmount > 0) {
        await prisma.purchaseOrder.update({
          where: { id: po.id },
          data: { amount: calculatedAmount }
        });
        console.log(`Fixed PO ${po.reference}: Set amount to ${calculatedAmount}`);
      }
    }
  }
}

fixZeroAmountPOs()
  .then(() => {
    console.log('Cleanup complete.');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
