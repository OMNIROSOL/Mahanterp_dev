import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- CUSTOMERS ---');
    const customers = await prisma.customer.findMany();
    console.log(JSON.stringify(customers, null, 2));

    console.log('--- QUOTES ---');
    const quotes = await prisma.salesQuote.findMany();
    console.log(JSON.stringify(quotes, null, 2));

    console.log('--- INVOICES ---');
    const invoices = await prisma.invoice.findMany();
    console.log(JSON.stringify(invoices, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
