const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const grns = await prisma.goodsReceivedNote.findMany({ include: { items: true } });
  for (const grn of grns) {
    const ledgers = await prisma.stockLedger.findMany({ where: { sourceDocumentId: grn.id } });
    console.log('GRN:', grn.reference, '| Status:', grn.status, '| Ledgers:', ledgers.length);
  }
}
main().catch(console.error).finally(() => process.exit(0));
