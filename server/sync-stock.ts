import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
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
  console.log('Sync complete!');
  process.exit(0);
}

main().catch(console.error);
