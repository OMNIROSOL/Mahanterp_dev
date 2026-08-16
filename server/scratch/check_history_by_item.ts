import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('Querying price history count per item...');
    const items = await prisma.item.findMany({
      include: {
        procurementPriceHistories: {
          include: {
            supplier: true
          }
        }
      }
    });

    console.log('\n--- ITEM PRICE HISTORY STATUS ---');
    items.forEach(item => {
      console.log(`Item: ${item.itemCode} - ${item.itemName}`);
      console.log(`  Valuation Method: ${item.valuationMethod}`);
      console.log(`  Purchase Price Master: ${item.purchasePrice}`);
      console.log(`  History Records: ${item.procurementPriceHistories.length}`);
      item.procurementPriceHistories.forEach((hist, idx) => {
        console.log(`    [${idx + 1}] Date: ${hist.purchaseDate.toLocaleDateString('en-GB')}, Supplier: ${hist.supplier?.name}, Qty: ${hist.qty}, Cost: ${hist.currency} ${hist.unitCost}`);
      });
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
