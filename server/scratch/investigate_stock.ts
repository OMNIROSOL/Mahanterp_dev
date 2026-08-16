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
    const item = await prisma.item.findUnique({
        where: { itemCode: 'MI0234' }
    });

    if (!item) {
        console.log('Item MI0234 not found');
        return;
    }

    console.log(`Found item: ${item.itemName} (ID: ${item.id})`);
    console.log(`Current qtyOnHand in Item table: ${item.qtyOnHand}`);

    const ledgerEntries = await prisma.stockLedger.findMany({
        where: { itemId: item.id },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`\nStock Ledger Entries (${ledgerEntries.length}):`);
    let runningTotal = 0;
    
    // Group by transaction type
    const byType = {};

    for (const entry of ledgerEntries) {
        const qty = Number(entry.qtyChange);
        runningTotal += qty;
        
        if (!byType[entry.transactionType]) {
            byType[entry.transactionType] = 0;
        }
        byType[entry.transactionType] += qty;

        console.log(`${entry.createdAt?.toISOString().split('T')[0]} | ${entry.transactionType.padEnd(20)} | ${entry.qtyChange.toString().padStart(8)} | Running Total: ${runningTotal.toFixed(4)}`);
    }

    console.log('\nSummary by Transaction Type:');
    console.table(byType);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
