import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECKING PURCHASE INVOICES ===");
    const pis = await prisma.invoices.findMany({
        where: {
            OR: [
                { reference: 'PO-0018' },
                { purchaseOrder: 'PO-0018' }
            ]
        }
    });
    console.log("PI Matches:", JSON.stringify(pis, null, 2));

    console.log("=== CHECKING GOODS RECEIVED NOTES ===");
    const grns = await prisma.goodsReceivedNote.findMany({
        where: {
            reference: 'PO-0018'
        },
        include: {
            items: true
        }
    });
    console.log("GRN Matches:", JSON.stringify(grns, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
