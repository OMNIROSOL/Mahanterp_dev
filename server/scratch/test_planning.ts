import { prisma } from '../index';

async function test() {
    try {
        const suppliersList = await prisma.suppliers.findMany({
          orderBy: { name: 'asc' }
        });

        const itemsList = await prisma.item.findMany({
          include: {
            procurementAttachments: true
          }
        });

        const months = 8;
        const pastDate = new Date();
        pastDate.setMonth(pastDate.getMonth() - months);

        const sales = await prisma.invoiceItem.findMany({
          where: {
            invoice: {
              issueDate: { gte: pastDate }
            }
          },
          select: {
            itemId: true,
            qty: true
          }
        });

        const incoming = await prisma.purchaseOrderItem.findMany({
          where: {
            purchaseOrder: {
              status: { notIn: ['Received', 'Arrived', 'Closed'] }
            }
          },
          select: {
            itemId: true,
            qty: true
          }
        });

        const reserved = await prisma.quoteItem.findMany({
          where: {
            orderId: { not: null },
            order: {
              status: { in: ['Pending', 'Approved'] }
            }
          },
          select: {
            itemId: true,
            qty: true
          }
        });

        console.log("Success! Returned data lengths:", {
          items: itemsList.length,
          suppliers: suppliersList.length,
          sales: sales.length,
          incoming: incoming.length,
          reserved: reserved.length
        });
    } catch (e: any) {
        console.error("ERROR:", e.message);
    }
}

test().catch(console.error).finally(() => process.exit(0));
