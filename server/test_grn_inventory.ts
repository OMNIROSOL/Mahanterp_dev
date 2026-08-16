import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    // 1. Get an existing Item
    const item = await prisma.item.findFirst();
    if (!item) {
      console.log('No item found in database. Please add an item first.');
      return;
    }
    const initialQty = Number(item.qtyOnHand || 0);
    console.log(`Item: ${item.itemName} (${item.id})`);
    console.log(`Initial Qty on Hand: ${initialQty}`);

    // 2. Get an existing Supplier
    const supplier = await prisma.suppliers.findFirst();
    if (!supplier) {
      console.log('No supplier found in database.');
      return;
    }

    // 3. Create GRN
    const reference = `TEST-GRN-${Date.now()}`;
    console.log(`Creating GRN with ref: ${reference} for 10 units...`);
    const grnRes = await fetch('http://localhost:3001/api/goods-received-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        reference,
        inventoryLocation: 'Main Warehouse',
        receivedDate: '2026-06-12',
        items: [
          {
            itemId: item.id,
            description: 'Test Item for GRN verification',
            qty: 10
          }
        ]
      })
    });
    
    if (!grnRes.ok) {
      const errorText = await grnRes.text();
      throw new Error(`Failed to create GRN: ${errorText}`);
    }
    
    const grn = await grnRes.json();
    console.log(`✅ GRN Created successfully! ID: ${grn.id}`);

    // 4. Verify Qty on Hand increased
    const updatedItem = await prisma.item.findUnique({ where: { id: item.id } });
    const afterQty = Number(updatedItem?.qtyOnHand || 0);
    console.log(`Qty on Hand after GRN: ${afterQty}`);
    if (afterQty === initialQty + 10) {
      console.log('✅ SUCCESS: Inventory increased by 10!');
    } else {
      console.log(`❌ FAILURE: Inventory is ${afterQty}, expected ${initialQty + 10}`);
    }

    // 5. Verify StockLedger entry exists
    const ledger = await prisma.stockLedger.findFirst({
      where: { sourceDocumentId: grn.id }
    });
    if (ledger) {
      console.log(`✅ SUCCESS: StockLedger entry found! ID: ${ledger.id}, qtyChange: ${ledger.qtyChange}, transactionType: ${ledger.transactionType}`);
    } else {
      console.log('❌ FAILURE: No StockLedger entry found for the GRN!');
    }

    // 6. Update GRN to 5 units
    console.log(`Updating GRN ${grn.id} to 5 units...`);
    const putRes = await fetch(`http://localhost:3001/api/goods-received-notes/${grn.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: supplier.id,
        reference,
        inventoryLocation: 'Main Warehouse',
        receivedDate: '2026-06-12',
        items: [
          {
            itemId: item.id,
            description: 'Test Item for GRN verification updated',
            qty: 5
          }
        ]
      })
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      throw new Error(`Failed to update GRN: ${errorText}`);
    }

    const updatedGrn = await putRes.json();
    console.log(`✅ GRN Updated successfully!`);

    // 7. Verify Qty on Hand adjusted to initialQty + 5
    const finalItem = await prisma.item.findUnique({ where: { id: item.id } });
    const finalQty = Number(finalItem?.qtyOnHand || 0);
    console.log(`Final Qty on Hand: ${finalQty}`);
    if (finalQty === initialQty + 5) {
      console.log('✅ SUCCESS: Inventory adjusted to initial + 5!');
    } else {
      console.log(`❌ FAILURE: Inventory is ${finalQty}, expected ${initialQty + 5}`);
    }

  } catch (err: any) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
