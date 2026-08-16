import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('Inserting location with only name...');
    const result = await prisma.location.create({
      data: {
        name: 'Test No Code 1'
      }
    });
    console.log('Success 1:', result);

    console.log('Inserting second location with only name...');
    const result2 = await prisma.location.create({
      data: {
        name: 'Test No Code 2'
      }
    });
    console.log('Success 2:', result2);

    // clean up
    await prisma.location.deleteMany({
      where: {
        name: {
          in: ['Test No Code 1', 'Test No Code 2']
        }
      }
    });
    console.log('Cleaned up!');
  } catch (err) {
    console.error('Error during insert:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
