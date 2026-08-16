import 'dotenv/config';
import { Pool } from 'pg';

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Cleaning up duplicates...');
    const deleteRes = await pool.query(`
      DELETE FROM inventory.inventory_unit_costs
      WHERE id NOT IN (
        SELECT (array_agg(id))[1]
        FROM inventory.inventory_unit_costs
        GROUP BY item_id
      )
    `);
    console.log(`Deleted ${deleteRes.rowCount} duplicate row(s).`);

    const res = await pool.query(`
      SELECT item_id, COUNT(*), array_agg(id) as ids, array_agg(item_name) as names
      FROM inventory.inventory_unit_costs
      GROUP BY item_id
      HAVING COUNT(*) > 1
    `);
    console.log('Remaining duplicate item_ids in inventory_unit_costs:', JSON.stringify(res.rows, null, 2));
    
    const countRes = await pool.query('SELECT COUNT(*) FROM inventory.inventory_unit_costs');
    console.log('Total rows in inventory_unit_costs:', countRes.rows[0].count);
  } catch (err) {
    console.error('Error cleaning duplicates:', err);
  } finally {
    await pool.end();
  }
}

check();
