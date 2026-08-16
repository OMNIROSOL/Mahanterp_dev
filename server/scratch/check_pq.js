const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const quotes = await prisma.purchaseQuote.findMany({ select: { reference: true } });
    console.log('Current Purchase Quotes:', quotes);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
