import { prisma } from '../index';

async function testTables() {
  try {
    // Attempt to query the tables using raw SQL first
    const tables: any = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('purchase_plans', 'purchase_plan_items');
    `;
    
    console.log("Found tables in DB:", tables.map((t: any) => t.table_name));

    // Test Prisma ORM queries to ensure they are fully mapped
    const plansCount = await prisma.purchasePlan.count();
    const itemsCount = await prisma.purchasePlanItem.count();
    
    console.log(`Prisma successfully connected!`);
    console.log(`Current Purchase Plans in DB: ${plansCount}`);
    console.log(`Current Purchase Plan Items in DB: ${itemsCount}`);
  } catch (err) {
    console.error("Database Test Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testTables();
