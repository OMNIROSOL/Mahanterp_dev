import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  // We exclude the 'admin' schema which contains your profiles, roles, and permissions.
  // Add or remove schemas from this list based on what you want to wipe.
  // Note: Wiping 'master' will delete your items, customers, and suppliers! 
  // If you only want to delete transactions, remove 'master' from this list.
  const schemasToClear = [
    'finance',
    'inventory', 
    'purchase', 
    'sales',
    'master' // WARNING: This contains Items, Customers, Suppliers, etc.
  ];

  console.log('Starting data wipe. Keeping admin schema intact...');

  for (const schema of schemasToClear) {
    console.log(`\n--- Clearing schema: ${schema} ---`);
    
    // Find all tables in the specific schema
    const res = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = $1`, [schema]);
    
    // Truncate each table. CASCADE ensures that any related records in other tables are also deleted.
    for (const row of res.rows) {
      console.log(`  Truncating ${schema}.${row.tablename}...`);
      await pool.query(`TRUNCATE TABLE "${schema}"."${row.tablename}" CASCADE;`);
    }
  }
  
  console.log("\n✅ Data cleared successfully. User profiles and roles were untouched.");
}

main()
  .catch((e) => {
    console.error("Error clearing data:", e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
