import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    const name = `TEST-LOC-${Date.now()}`;
    const code = `TL-${Math.floor(Math.random() * 1000)}`;
    console.log(`Creating test location: ${name} (${code})...`);

    const res = await fetch('http://localhost:3001/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create location: ${errorText}`);
    }

    const created = await res.json();
    console.log('✅ Location Created successfully:', JSON.stringify(created, null, 2));

    // Verify in database
    const dbLoc = await prisma.location.findUnique({
      where: { id: created.id }
    });
    if (dbLoc && dbLoc.name === name) {
      console.log('✅ SUCCESS: Verified in database!');
    } else {
      console.log('❌ FAILURE: Location not found or details mismatch in database!');
    }

    // Clean up
    console.log(`Cleaning up location ${created.id}...`);
    const delRes = await fetch(`http://localhost:3001/api/locations/${created.id}`, {
      method: 'DELETE'
    });
    if (delRes.ok) {
      console.log('✅ Cleanup complete!');
    } else {
      console.log('❌ Failure during cleanup!');
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
