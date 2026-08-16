import { Pool } from 'pg';

const url = 'postgresql://postgres:1234@localhost:5432/mahant';

async function test() {
  const pool = new Pool({ connectionString: url });
  try {
    const schemas = ['admin', 'finance', 'inventory', 'master', 'purchase', 'sales'];
    for (const schema of schemas) {
      const res = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
      `, [schema]);
      console.log(`Schema [${schema}]: ${res.rows.length} tables found`);
      if (res.rows.length > 0) {
        console.log(`  Tables: ${res.rows.map(r => r.table_name).join(', ')}`);
      }
    }
  } catch (err: any) {
    console.log(`❌ ERROR: ${err.message}`);
  } finally {
    await pool.end();
  }
}

test();
