import { prisma } from '../index';

async function testPurchasePlan() {
  try {
    console.log("Connecting to Database...");
    
    // 1. Get an item and a supplier
    const item = await prisma.item.findFirst();
    const supplier = await prisma.suppliers.findFirst();
    
    if (!item || !supplier) {
      console.log("No items or suppliers found in the database!");
      return;
    }
    
    console.log(`Using Item: ${item.itemCode} - ${item.itemName}`);
    console.log(`Using Supplier: ${supplier.code} - ${supplier.name}`);
    
    const reference = `TEST-${Date.now()}`;
    
    // 2. Create the plan in the database directly
    console.log(`Creating Purchase Plan ${reference}...`);
    const savedPlan = await prisma.purchasePlan.create({
      data: {
        reference: reference,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        createdBy: "Automated Test",
        status: "Draft",
        items: {
          create: [
            {
              itemId: item.id,
              supplierId: supplier.id,
              availableStock: 10,
              avgConsumption: 5,
              safetyStock: 15,
              incomingPos: 0,
              projectedDemand: 20,
              suggestedQty: 25,
              finalOrderQty: 30, // Test qty
              remarks: "Automated test plan",
              aiRecommendation: "Test AI recommendation"
            }
          ]
        },
        auditLogs: {
          create: {
            userId: 'u-system',
            userName: 'Automated Test',
            action: 'Created Purchase Plan',
            details: `Plan reference ${reference} generated`
          }
        }
      },
      include: { items: true, auditLogs: true }
    });
    
    console.log("\n✅ SUCCESS! Plan saved in Database:");
    console.log("Reference:", savedPlan.reference);
    console.log("Status:", savedPlan.status);
    console.log(`Items count: ${savedPlan.items.length}`);
    
    const savedItem = savedPlan.items[0];
    console.log("\n✅ SUCCESS! Plan Item Data:");
    console.log(`Supplier ID matches: ${savedItem.supplierId === supplier.id}`);
    console.log(`Final Order Qty: ${savedItem.finalOrderQty}`);
    
    // Clean up
    console.log("\nCleaning up test data...");
    await prisma.purchasePlan.delete({ where: { id: savedPlan.id } });
    console.log("Clean up successful.");

  } catch (err: any) {
    console.error("Test Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testPurchasePlan();
