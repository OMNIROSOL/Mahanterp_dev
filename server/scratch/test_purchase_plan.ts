import { prisma } from '../index';
import axios from 'axios';

async function testPurchasePlan() {
  try {
    // 1. Get an item and a supplier
    const item = await prisma.item.findFirst();
    const supplier = await prisma.suppliers.findFirst();
    
    if (!item || !supplier) {
      console.log("No items or suppliers found in the database!");
      return;
    }
    
    console.log(`Using Item: ${item.itemCode} - ${item.itemName}`);
    console.log(`Using Supplier: ${supplier.code} - ${supplier.name}`);
    
    // 2. Create the payload for the API
    const payload = {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      submitForApproval: false, // Save as Draft
      items: [
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
    };
    
    console.log("Sending POST request to /api/procurement/plans...");
    const response = await axios.post('http://localhost:3001/api/procurement/plans', payload);
    console.log("API Response:", response.data);
    
    // 3. Verify in the database
    const planId = response.data.id;
    const savedPlan = await prisma.purchasePlan.findUnique({
      where: { id: planId },
      include: { items: true }
    });
    
    if (savedPlan) {
      console.log("\n✅ SUCCESS! Plan saved in Database:");
      console.log("Reference:", savedPlan.reference);
      console.log("Status:", savedPlan.status);
      console.log(`Items count: ${savedPlan.items.length}`);
      
      const savedItem = savedPlan.items[0];
      console.log("\n✅ SUCCESS! Plan Item Data:");
      console.log(`Supplier ID matches: ${savedItem.supplierId === supplier.id}`);
      console.log(`Final Order Qty: ${savedItem.finalOrderQty}`);
    } else {
      console.log("❌ Failed to find the saved plan in the database.");
    }
    
  } catch (err: any) {
    console.error("Test Failed:", err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPurchasePlan();
