import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.procurementShipment.count();
    console.log("Shipments count:", count);
}
main();
