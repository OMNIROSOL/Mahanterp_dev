import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting Inventory Reconciliation...');
    
    // 1. Fetch all items
    const items = await prisma.item.findMany();
    console.log(`Found ${items.length} items in the database.`);
    
    let updatedCount = 0;
    
    for (const item of items) {
        // 2. Fetch all stock ledger entries for this item
        const ledgerEntries = await prisma.stockLedger.findMany({
            where: { itemId: item.id }
        });
        
        // 3. Calculate true total qty across all locations
        let trueQty = 0;
        for (const entry of ledgerEntries) {
            trueQty += Number(entry.qtyChange);
        }
        
        // 4. If there's a discrepancy, update the Item table
        if (Number(item.qtyOnHand) !== trueQty) {
            console.log(`Mismatch found for [${item.itemCode}] ${item.itemName}`);
            console.log(` -> Cached Qty: ${item.qtyOnHand}`);
            console.log(` -> True Ledger Qty: ${trueQty}`);
            
            await prisma.item.update({
                where: { id: item.id },
                data: { qtyOnHand: trueQty }
            });
            console.log(` -> FIXED! Updated to ${trueQty}\n`);
            updatedCount++;
        }
    }
    
    console.log(`Reconciliation Complete. Fixed ${updatedCount} items.`);
}

main()
    .catch(e => console.error('Error during reconciliation:', e))
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
