import { Client } from 'pg';
import 'dotenv/config';

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'inventory' AND table_name = 'locations';
    `);
    console.log('Columns in inventory.locations:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
