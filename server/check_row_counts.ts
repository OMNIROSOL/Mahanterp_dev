import 'dotenv/config';
import { Pool } from 'pg';

async function checkData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tables = [
      'master.customers',
      'master.items',
      'sales.sales_quotes',
      'sales.sales_orders',
      'sales.invoices'
    ];

    for (const table of tables) {
      const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`Table ${table}: ${res.rows[0].count} rows`);
    }
  } catch (err) {
    console.error('Error checking data:', err);
  } finally {
    await pool.end();
  }
}

checkData();
