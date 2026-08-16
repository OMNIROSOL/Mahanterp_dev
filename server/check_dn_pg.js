const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require"
});

async function main() {
  const res = await pool.query('SELECT id, reference, delivery_address FROM sales.delivery_notes LIMIT 5');
  console.log('DELIVERY NOTES:', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
