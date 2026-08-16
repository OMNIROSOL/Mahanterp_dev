const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const id = '51961747-5510-45ac-b269-fa2ef7bbf13e';
  const note = await prisma.deliveryNote.findFirst({
    where: {
      OR: [
        { id: id.length === 36 ? id : undefined },
        { reference: id }
      ]
    }
  });
  console.log('NOTE FOUND:', JSON.stringify(note, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
