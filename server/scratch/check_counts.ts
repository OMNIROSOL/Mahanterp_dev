import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('--- Purchase Orders Count by Supplier ---');
    const poRes = await pool.query(`
      SELECT supplier_id, COUNT(*) as count 
      FROM purchase.purchase_orders 
      GROUP BY supplier_id;
    `);
    console.table(poRes.rows);

    console.log('--- Suppliers List ---');
    const supRes = await pool.query(`
      SELECT id, name FROM master.suppliers;
    `);
    console.table(supRes.rows);

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
