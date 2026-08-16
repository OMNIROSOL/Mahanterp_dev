import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const shipment = await prisma.shipment.findFirst({
        where: { reference: 'SHP-0003' },
        include: { items: true }
    });
    console.log('Shipment SHP-0003:', shipment);
    
    if (shipment) {
        const grns = await prisma.goodsReceivedNote.findMany({
            where: { description: { contains: 'SHP-0003' } },
            include: { items: true }
        });
        console.log('Related GRNs:', JSON.stringify(grns, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
