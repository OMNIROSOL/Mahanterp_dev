import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearTransactionsOnly() {
  console.log('----------------------------------------------------');
  console.log(' Starting Transaction Data Wipe...');
  console.log(' Preserved: User Profiles, User Names, User Permissions (admin)');
  console.log(' Preserved: Master Data (Customers, Suppliers, Items, Accounts)');
  console.log('----------------------------------------------------\n');

  const transactionSchemas = [
    'sales',
    'purchase', 
    'inventory',
    'finance'
  ];

  for (const schema of transactionSchemas) {
    console.log(`\nClearing transaction schema: [${schema}]`);
    
    // Find all tables in schema
    const res = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1`,
      [schema]
    );

    if (res.rows.length === 0) {
      console.log(`  No tables found in ${schema}.`);
      continue;
    }

    for (const row of res.rows) {
      console.log(`  TRUNCATING table "${schema}"."${row.tablename}"...`);
      await pool.query(`TRUNCATE TABLE "${schema}"."${row.tablename}" CASCADE;`);
    }
  }

  // Reset stock quantities in master items to 0 since stock ledger was cleared
  try {
    console.log('\nResetting item stock quantities (qty_on_hand) to 0 in master.items...');
    await pool.query(`UPDATE "master"."items" SET qty_on_hand = 0;`);
    console.log('  Stock quantities reset.');
  } catch (err: any) {
    console.log('  Notice: Could not reset item stock quantities:', err.message);
  }

  console.log('\n----------------------------------------------------');
  console.log(' SUCCESS: All transaction data has been cleared!');
  console.log(' User accounts, permissions, and profiles remain intact.');
  console.log('----------------------------------------------------\n');
}

clearTransactionsOnly()
  .catch((e) => {
    console.error("CRITICAL ERROR clearing transactions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
