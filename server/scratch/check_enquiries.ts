import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allEnquiries = await prisma.purchaseEnquiry.findMany({
    select: { id: true, reference: true, status: true }
  });
  
  console.log(`Total enquiries: ${allEnquiries.length}`);
  console.log('Sample enquiries:', allEnquiries.slice(0, 5));
  
  const statuses = new Set(allEnquiries.map(e => e.status));
  console.log('Distinct statuses:', Array.from(statuses));
  
  // Let's also check if they have items
  const withItems = await prisma.purchaseEnquiry.findMany({
    where: { status: { in: ['Open', 'Active', 'Pending'] } },
    include: { items: true }
  });
  console.log('Enquiries with items (Open/Active/Pending):', withItems.map(e => ({ ref: e.reference, status: e.status, itemsCount: e.items.length })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
