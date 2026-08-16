const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function main() {
  await client.connect();
  const columns = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'invoice_items'");
  console.log('--- COLUMNS IN invoice_items ---');
  console.log(JSON.stringify(columns.rows, null, 2));

  const sample = await client.query("SELECT * FROM sales.invoice_items LIMIT 5");
  console.log('--- SAMPLE ROWS IN invoice_items ---');
  console.log(JSON.stringify(sample.rows, null, 2));

  await client.end();
}
main().catch(console.error);
