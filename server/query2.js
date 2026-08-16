require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkMinPrice() {
  const itemRes = await pool.query("SELECT id, item_code, item_name, selling_price FROM master.items WHERE item_name LIKE '%315/80 R22.5 UNIVERSAL%'");
  if (itemRes.rows.length === 0) {
    console.log('Item not found');
    return process.exit(0);
  }
  const item = itemRes.rows[0];
  console.log('Item:', item.item_name, '| Standard Selling Price:', item.selling_price);

  const costRes = await pool.query("SELECT min_selling_price, division FROM inventory.inventory_unit_costs WHERE item_id = $1 ORDER BY created_at DESC", [item.id]);
  
  if (costRes.rows.length === 0) {
    console.log('No Unit Cost records found. It falls back to standard margin logic.');
  } else {
    console.log('Unit Cost Records found:');
    costRes.rows.forEach(r => {
      console.log(`- Division: ${r.division || 'All'}, Min Selling Price: ${r.min_selling_price}`);
    });
  }
  process.exit(0);
}

checkMinPrice().catch(console.error);
