import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:3001/api';

async function verifyWorkflow() {
  console.log('--- STARTING INVENTORY TRANSFER WORKFLOW VERIFICATION ---');

  // Find a test item and locations
  const item = await prisma.item.findFirst({ where: { itemCode: 'MI0084' } });
  const locFrom = await prisma.location.findFirst({ where: { name: 'KITWE' } });
  const locTo = await prisma.location.findFirst({ where: { name: 'NDOLA - SPARES' } });

  if (!item || !locFrom || !locTo) {
    console.error('❌ Required seed data not found. Run seed_db.ts first.');
    process.exit(1);
  }

  // Helper to query stock at location
  const getStock = async (itemId: string, locationName: string) => {
    const ledger = await prisma.stockLedger.findMany({
      where: {
        itemId,
        location: { name: locationName }
      }
    });
    return ledger.reduce((sum, entry) => sum + Number(entry.qtyChange), 0);
  };

  const initialSourceStock = await getStock(item.id, locFrom.name);
  const initialDestStock = await getStock(item.id, locTo.name);

  console.log(`Initial stock levels for ${item.itemName} (${item.itemCode}):`);
  console.log(`- KITWE (Source): ${initialSourceStock}`);
  console.log(`- NDOLA - SPARES (Destination): ${initialDestStock}`);

  const transferRef = `TEST-TR-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    reference: transferRef,
    date: new Date().toISOString().split('T')[0],
    fromLocation: locFrom.name,
    toLocation: locTo.name,
    description: 'Automated test of workflow status logic',
    status: 'Draft',
    items: [
      {
        inventoryItem: `${item.itemCode} - ${item.itemName}`,
        qty: 5
      }
    ]
  };

  let transferId = '';

  try {
    // 1. Create in Draft status
    console.log('\nStep 1: Creating transfer in Draft status...');
    const createRes = await axios.post(`${BACKEND_URL}/inventory-transfers`, payload);
    transferId = createRes.data.id;
    console.log(`✅ Transfer created with ID: ${transferId}, status: ${createRes.data.status}`);

    // Verify stock and documents in Draft
    let srcStock = await getStock(item.id, locFrom.name);
    let destStock = await getStock(item.id, locTo.name);
    if (srcStock !== initialSourceStock || destStock !== initialDestStock) {
      throw new Error(`Stock changed in Draft: KITWE=${srcStock}, NDOLA=${destStock}`);
    }
    console.log('✅ Stock unchanged in Draft.');

    // 2. Patch to Pending Approval
    console.log('\nStep 2: Submitting for Manager Approval...');
    const patchPending = await axios.patch(`${BACKEND_URL}/inventory-transfers/${transferId}`, { status: 'Pending Approval' });
    console.log(`✅ Status is now: ${patchPending.data.status}`);

    // 3. Patch to Approved
    console.log('\nStep 3: Approving transfer (as Manager)...');
    const patchApproved = await axios.patch(`${BACKEND_URL}/inventory-transfers/${transferId}`, { status: 'Approved' });
    console.log(`✅ Status is now: ${patchApproved.data.status}`);

    // 4. Patch to Ready to Dispatch (Delivery Note prepared, stock decremented)
    console.log('\nStep 4: Preparing Delivery Note / Ready to Dispatch...');
    const patchDispatch = await axios.patch(`${BACKEND_URL}/inventory-transfers/${transferId}`, { status: 'Ready to Dispatch' });
    console.log(`✅ Status is now: ${patchDispatch.data.status}`);

    // Verify Delivery Note is created
    const getDetails1 = await axios.get(`${BACKEND_URL}/inventory-transfers/${transferId}`);
    if (!getDetails1.data.deliveryNoteId) {
      throw new Error('deliveryNoteId is null/missing in API response');
    }
    console.log(`✅ Associated Delivery Note ID resolved: ${getDetails1.data.deliveryNoteId}`);

    // Verify stock is decremented at source (KITWE)
    srcStock = await getStock(item.id, locFrom.name);
    destStock = await getStock(item.id, locTo.name);
    console.log(`Current stock levels after Ready to Dispatch: KITWE=${srcStock}, NDOLA=${destStock}`);
    if (srcStock !== initialSourceStock - 5) {
      throw new Error(`KITWE stock not decremented by 5. Expected: ${initialSourceStock - 5}, Got: ${srcStock}`);
    }
    if (destStock !== initialDestStock) {
      throw new Error(`NDOLA stock should not change yet. Expected: ${initialDestStock}, Got: ${destStock}`);
    }
    console.log('✅ Source stock correctly decremented. Destination stock unchanged.');

    // 5. Patch to Sent
    console.log('\nStep 5: Dispatching / Sent...');
    const patchSent = await axios.patch(`${BACKEND_URL}/inventory-transfers/${transferId}`, { status: 'Sent' });
    console.log(`✅ Status is now: ${patchSent.data.status}`);

    // 6. Patch to Received (GRN posted, stock incremented)
    console.log('\nStep 6: Receiving / Received (Post GRN)...');
    const patchReceived = await axios.patch(`${BACKEND_URL}/inventory-transfers/${transferId}`, { status: 'Received' });
    console.log(`✅ Status is now: ${patchReceived.data.status}`);

    // Verify GRN is created
    const getDetails2 = await axios.get(`${BACKEND_URL}/inventory-transfers/${transferId}`);
    if (!getDetails2.data.goodsReceivedNoteId) {
      throw new Error('goodsReceivedNoteId is null/missing in API response');
    }
    console.log(`✅ Associated GRN ID resolved: ${getDetails2.data.goodsReceivedNoteId}`);

    // Verify stock is incremented at destination (NDOLA)
    srcStock = await getStock(item.id, locFrom.name);
    destStock = await getStock(item.id, locTo.name);
    console.log(`Current stock levels after Received: KITWE=${srcStock}, NDOLA=${destStock}`);
    if (srcStock !== initialSourceStock - 5) {
      throw new Error(`KITWE stock changed unexpectedly. Got: ${srcStock}`);
    }
    if (destStock !== initialDestStock + 5) {
      throw new Error(`NDOLA stock not incremented by 5. Expected: ${initialDestStock + 5}, Got: ${destStock}`);
    }
    console.log('✅ Destination stock correctly incremented.');

    // 7. Revert to Draft (cleanup documents and stock)
    console.log('\nStep 7: Reverting back to Draft (Verify self-healing cleanup)...');
    const patchDraft = await axios.patch(`${BACKEND_URL}/inventory-transfers/${transferId}`, { status: 'Draft' });
    console.log(`✅ Status is now: ${patchDraft.data.status}`);

    // Verify documents are deleted
    const getDetails3 = await axios.get(`${BACKEND_URL}/inventory-transfers/${transferId}`);
    if (getDetails3.data.deliveryNoteId || getDetails3.data.goodsReceivedNoteId) {
      throw new Error(`Documents still linked: DN=${getDetails3.data.deliveryNoteId}, GRN=${getDetails3.data.goodsReceivedNoteId}`);
    }
    console.log('✅ Generated documents deleted.');

    // Verify stock is reverted
    srcStock = await getStock(item.id, locFrom.name);
    destStock = await getStock(item.id, locTo.name);
    console.log(`Current stock levels after reverting to Draft: KITWE=${srcStock}, NDOLA=${destStock}`);
    if (srcStock !== initialSourceStock || destStock !== initialDestStock) {
      throw new Error(`Stock levels did not revert: KITWE=${srcStock}, NDOLA=${destStock}`);
    }
    console.log('✅ Stock levels successfully reverted to initial values.');

    console.log('\n🎉 ALL WORKFLOW STATE MACHINE CHECKS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('\n❌ VERIFICATION FAILED:', err.message || err);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyWorkflow();
