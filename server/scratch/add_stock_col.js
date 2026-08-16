const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require"
});
async function main() {
  await client.connect();
  await client.query("ALTER TABLE master.items ADD COLUMN IF NOT EXISTS qty_on_hand DECIMAL(15, 2) DEFAULT 0");
  console.log("Column qty_on_hand added to master.items");
  await client.end();
}
main().catch(console.error);
