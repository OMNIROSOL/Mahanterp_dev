const { Pool } = require('D:/ERP_AUTOMATION-OLD_DEV/server/node_modules/pg');

const passwords = ['password4', '1234', 'postgres', 'pas', ''];

async function testPasswords() {
  for (const pw of passwords) {
    const pool = new Pool({
      connectionString: `postgresql://postgres:${pw}@127.0.0.1:5432/erp`
    });
    try {
      console.log(`Trying password: "${pw}"...`);
      const res = await pool.query('SELECT 1');
      console.log(`SUCCESS with password: "${pw}"`);
      
      const customers = await pool.query('SELECT * FROM master.customers');
      console.log('Customers found:', customers.rowCount);
      console.log(JSON.stringify(customers.rows, null, 2));
      
      await pool.end();
      return;
    } catch (err) {
      console.log(`Failed with "${pw}": ${err.message}`);
    } finally {
      await pool.end();
    }
  }
  console.log('All passwords failed.');
}

testPasswords();
