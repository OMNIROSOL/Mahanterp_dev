const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require"
});

async function main() {
  const res = await pool.query(`
    SELECT dn.id, dn.reference, dn.delivery_address, c.name, c.shipping_address, c.address 
    FROM sales.delivery_notes dn
    LEFT JOIN master.customers c ON dn.customer_id = c.id
    WHERE dn.id = '51961747-5510-45ac-b269-fa2ef7bbf13e'
  `);
  console.log('DELIVERY NOTE DATA:', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
