import { Pool } from 'pg';

const urls = [
  'postgresql://postgres:1234@localhost:5432/mahant',
  'postgresql://postgres:1234@localhost:5432/postgres',
  'postgresql://postgres:postgres@localhost:5432/postgres',
  'postgresql://postgres:1234@localhost:5432/dev_erp_render'
];

async function test() {
  for (const url of urls) {
    console.log(`Testing: ${url.replace(/:[^:@]+@/, ':****@')}`);
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 2000 });
    try {
      const res = await pool.query('SELECT NOW()');
      console.log(`✅ SUCCESS! Database time: ${res.rows[0].now}`);
      
      // Check schemas or database name
      const dbNameRes = await pool.query('SELECT current_database()');
      console.log(`Current DB: ${dbNameRes.rows[0].current_database}`);
      
      await pool.end();
      return; // Stop if we found a working one
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message}`);
    } finally {
      try { await pool.end(); } catch (e) {}
    }
  }
}

test();
