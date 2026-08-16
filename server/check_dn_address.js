const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const notes = await prisma.deliveryNote.findMany({
    select: {
      id: true,
      reference: true,
      deliveryAddress: true,
      customer: { select: { name: true, shippingAddress: true, address: true } }
    },
    take: 5
  });
  console.log('DELIVERY NOTES:', JSON.stringify(notes, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
