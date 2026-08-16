import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRefs() {
  try {
    const quotes = await prisma.purchaseQuote.findMany({
      select: { reference: true }
    });
    console.log('Purchase Quotes:', quotes);
    
    const orders = await prisma.purchaseOrder.findMany({
      select: { reference: true }
    });
    console.log('Purchase Orders:', orders);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkRefs();
