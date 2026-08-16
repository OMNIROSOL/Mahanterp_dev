import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const stockByLocation = await prisma.stockLedger.groupBy({
    by: ['itemId', 'locationId'],
    _sum: { qtyChange: true },
  });

  for (const sl of stockByLocation) {
    const qty = Number(sl._sum.qtyChange || 0);
    if (qty < 0) {
      const amountToAdd = Math.abs(qty);
      console.log(`Location ${sl.locationId} for item ${sl.itemId} is negative (${qty}). Adding ${amountToAdd}...`);
      
      await prisma.stockLedger.create({
        data: {
          itemId: sl.itemId,
          locationId: sl.locationId,
          qtyChange: amountToAdd,
          transactionType: 'System Adjustment',
        }
      });
    }
  }

  // Recalculate global qtyOnHand
  const items = await prisma.item.findMany();
  for (const item of items) {
    const ledgers = await prisma.stockLedger.aggregate({
      where: { itemId: item.id },
      _sum: { qtyChange: true }
    });
    const realQty = Number(ledgers._sum.qtyChange || 0);
    if (Number(item.qtyOnHand) !== realQty) {
      console.log(`Syncing ${item.itemName}: DB Qty=${item.qtyOnHand}, Real Qty=${realQty}`);
      await prisma.item.update({
        where: { id: item.id },
        data: { qtyOnHand: realQty }
      });
    }
  }
  
  console.log('Negative stock cleanup complete!');
  process.exit(0);
}

main().catch(console.error);
