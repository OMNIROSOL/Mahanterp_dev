import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const items = await prisma.item.findMany({
    select: { id: true, itemCode: true, itemName: true, purchasePrice: true, sellingPrice: true }
  });

  const unitCosts = await prisma.inventoryUnitCost.findMany({
    select: { id: true, itemId: true, itemName: true, unitCost: true, marginPercent: true, minSellingPrice: true, division: true }
  });

  console.log('--- ITEMS ---');
  console.log(JSON.stringify(items, null, 2));

  console.log('--- INVENTORY UNIT COSTS ---');
  console.log(JSON.stringify(unitCosts, null, 2));

  await pool.end();
}

main();
