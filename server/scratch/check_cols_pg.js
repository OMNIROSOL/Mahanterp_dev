const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require"
});
async function main() {
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'master' AND table_name = 'items'");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
main().catch(console.error);
