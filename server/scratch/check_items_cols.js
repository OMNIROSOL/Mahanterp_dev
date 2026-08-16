const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'master' AND table_name = 'items'
  `);
  console.log('COLUMNS OF master.items:', res.rows);
  await pool.end();
}

run();
