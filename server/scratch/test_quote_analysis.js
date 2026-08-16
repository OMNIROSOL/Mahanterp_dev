const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const activeEnquiries = await prisma.purchaseEnquiry.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    console.log("Total Enquiries:", activeEnquiries.length);
    if (activeEnquiries.length > 0) {
      console.log("Sample Enquiry Status:", activeEnquiries[0].status);
      console.log("Sample Enquiry Items Length:", activeEnquiries[0].items.length);
    }
  } catch (error) {
    console.error("Query Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
