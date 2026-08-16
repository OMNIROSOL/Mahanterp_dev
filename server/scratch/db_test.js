const { Client } = require('pg');

async function testConnection() {
  const connectionString = 'postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require';
  const client = new Client({ connectionString });

  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL on Render');

    const schemas = await client.query('SELECT schema_name FROM information_schema.schemata');
    console.log('Available schemas:', schemas.rows.map(r => r.schema_name).join(', '));

    console.log('\n--- Record Counts per Table ---');
    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables 
      WHERE table_schema IN ('master', 'purchase', 'sales')
      ORDER BY table_schema, table_name
    `);

    for (const row of tables.rows) {
        try {
            const res = await client.query(`SELECT count(*) FROM "${row.table_schema}"."${row.table_name}"`);
            console.log(`[${row.table_schema}.${row.table_name}]: ${res.rows[0].count} rows`);
        } catch (e) {
            // console.error(\`Failed to query \${row.table_schema}.\${row.table_name}: \${e.message}\`);
        }
    }

  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
