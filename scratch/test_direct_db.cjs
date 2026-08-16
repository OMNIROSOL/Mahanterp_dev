const { Pool } = require('D:/ERP_AUTOMATION-OLD_DEV/server/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:password4@127.0.0.1:5432/erp'
});

async function test() {
  try {
    console.log('Connecting to database...');
    const res = await pool.query('SELECT * FROM master.customers');
    console.log('Success! Rows found:', res.rowCount);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error connecting to database:', err.message);
  } finally {
    await pool.end();
  }
}

test();
