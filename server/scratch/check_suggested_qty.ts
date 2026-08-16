import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('Fetching planning calculations audit...');
    
    const suppliersList = await prisma.suppliers.findMany();
    const itemsList = await prisma.item.findMany();

    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

    // Sales history
    const sales = await prisma.invoiceItem.findMany({
      where: { invoice: { issueDate: { gte: eightMonthsAgo } } },
      select: { itemId: true, qty: true }
    });

    // Incoming Qty
    const incoming = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrder: { status: { notIn: ['Received', 'Arrived', 'Closed'] } } },
      select: { itemId: true, qty: true }
    });

    // Reserved Qty
    const reserved = await prisma.quoteItem.findMany({
      where: { orderId: { not: null }, order: { status: { in: ['Pending', 'Approved'] } } },
      select: { itemId: true, qty: true }
    });

    const demandMap = new Map<string, number>();
    sales.forEach(s => demandMap.set(s.itemId, (demandMap.get(s.itemId) || 0) + Number(s.qty)));

    const incomingMap = new Map<string, number>();
    incoming.forEach(i => {
      if (i.itemId) incomingMap.set(i.itemId, (incomingMap.get(i.itemId) || 0) + Number(i.qty));
    });

    const reservedMap = new Map<string, number>();
    reserved.forEach(r => reservedMap.set(r.itemId, (reservedMap.get(r.itemId) || 0) + Number(r.qty)));

    console.log('\n--- PLANNER CALCULATIONS AUDIT ---');
    
    let processed = 0;
    for (const item of itemsList) {
      const totalSales8m = demandMap.get(item.id) || 0;
      const avgDemand = parseFloat((totalSales8m / 8).toFixed(2));
      const incomingQty = incomingMap.get(item.id) || 0;
      const reservedQty = reservedMap.get(item.id) || 0;
      const qtyOnHand = Number(item.qtyOnHand || 0);

      const availableStock = qtyOnHand + incomingQty - reservedQty;

      const supplier = suppliersList.find(s => 
        (s.brand && item.category && s.brand.toLowerCase() === item.category.toLowerCase()) || 
        (s.name && item.itemName.toLowerCase().includes(s.name.toLowerCase()))
      ) || suppliersList[0];

      let totalLeadTime = 0;
      let leadTimeMonths = 0;

      if (supplier) {
        totalLeadTime = (supplier.leadTimeProcessing || 0) + 
                        (supplier.leadTimeProduction || 0) + 
                        (supplier.leadTimeShipping || 0) + 
                        (supplier.leadTimeRoad || 0) + 
                        (supplier.leadTimeExtra || 0);
        leadTimeMonths = parseFloat((totalLeadTime / 30).toFixed(2));
      }

      const forecastRequirement = parseFloat((avgDemand * leadTimeMonths).toFixed(2));
      const recommendedQty = Math.max(0, parseFloat((forecastRequirement - availableStock).toFixed(2)));

      if (avgDemand > 0 || incomingQty > 0 || reservedQty > 0 || recommendedQty > 0) {
        processed++;
        console.log(`\nItem: ${item.itemCode} - ${item.itemName}`);
        console.log(`  Supplier: ${supplier ? `${supplier.name} (${supplier.code})` : 'None'}`);
        console.log(`  Lead Time Days (Months): ${totalLeadTime} Days (${leadTimeMonths} Months)`);
        console.log(`  Opening Stock (On Hand): ${qtyOnHand}`);
        console.log(`  Upcoming Stock (Incoming): ${incomingQty}`);
        console.log(`  Reserved Stock: ${reservedQty}`);
        console.log(`  Closing Stock (Available): ${availableStock}`);
        console.log(`  8-Month Avg Demand: ${avgDemand} / month`);
        console.log(`  Forecast Requirement (Demand during Lead Time): ${forecastRequirement}`);
        console.log(`  Suggested Qty: ${recommendedQty}`);
      }
    }
    
    if (processed === 0) {
      console.log('No active items with sales, incoming, or suggested quantities found.');
    }
  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
