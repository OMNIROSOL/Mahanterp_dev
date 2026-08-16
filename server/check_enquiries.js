const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enquiries = await prisma.purchaseEnquiry.findMany({
    include: { supplier: true }
  });
  console.log('Enquiry Count:', enquiries.length);
  console.log('Enquiries:', JSON.stringify(enquiries, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
