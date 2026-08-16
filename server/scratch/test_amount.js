const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pe = await prisma.purchaseEnquiryItem.findFirst({ where: { qty: { gt: 0 } } });
  console.log('Item:', pe);
  console.log('totalAmount:', pe.totalAmount, 'typeof', typeof pe.totalAmount);
  console.log('unitPrice:', pe.unitPrice, 'typeof', typeof pe.unitPrice);
  console.log('qty:', pe.qty, 'typeof', typeof pe.qty);
  
  const sum = Number(pe.totalAmount || 0);
  console.log('Parsed sum from totalAmount:', sum);

  const fallbackSum = Number(pe.qty || 0) * Number(pe.unitPrice || 0);
  console.log('Parsed fallback sum (qty * unitPrice):', fallbackSum);
}

run().finally(() => prisma.$disconnect());
