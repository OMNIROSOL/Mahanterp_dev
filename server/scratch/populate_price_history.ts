import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('Fetching all purchase invoice items...');
    const invoiceItems = await prisma.purchaseInvoiceItem.findMany({
      include: {
        invoice: {
          include: {
            suppliers: true
          }
        }
      }
    });

    console.log(`Found ${invoiceItems.length} purchase invoice items. Processing...`);

    let createdCount = 0;
    for (const item of invoiceItems) {
      if (!item.itemId) continue;

      const supplierId = item.invoice.supplier_id;
      const purchaseDate = item.invoice.created_at || new Date();
      const qty = item.qty;
      const unitCost = item.unitPrice;
      const currency = item.invoice.suppliers?.currency || 'USD';

      // Check if this history entry already exists to avoid duplicates
      const exists = await prisma.procurementPriceHistory.findFirst({
        where: {
          itemId: item.itemId,
          supplierId,
          purchaseDate,
          qty,
          unitCost
        }
      });

      if (!exists) {
        await prisma.procurementPriceHistory.create({
          data: {
            itemId: item.itemId,
            supplierId,
            purchaseDate,
            qty,
            unitCost,
            currency
          }
        });
        createdCount++;
      }
    }

    console.log(`Migration finished. Created ${createdCount} procurement price history records.`);
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
