import { Client } from 'pg';

const renderUrl = "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require";

async function run() {
  const client = new Client({ connectionString: renderUrl });
  try {
    await client.connect();
    console.log('Connected to Render database. Fetching row counts...');
    
    const schemas = ['master', 'sales', 'inventory', 'procurement'];
    for (const schema of schemas) {
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_type = 'BASE TABLE';
      `, [schema]);
      
      for (const row of tablesRes.rows) {
        const tableName = row.table_name;
        try {
          const countRes = await client.query(`SELECT COUNT(*) FROM "${schema}"."${tableName}"`);
          console.log(`Table ${schema}.${tableName}: ${countRes.rows[0].count} rows`);
        } catch (e: any) {
          console.log(`Error counting ${schema}.${tableName}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('Failed to connect:', err);
  } finally {
    await client.end();
  }
}

run();
