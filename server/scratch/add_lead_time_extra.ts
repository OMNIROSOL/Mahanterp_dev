import { Client } from 'pg';
import 'dotenv/config';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE master.suppliers 
      ADD COLUMN IF NOT EXISTS lead_time_extra INT DEFAULT 0;
    `);
    console.log('lead_time_extra column added successfully (or already existed)');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

main();
