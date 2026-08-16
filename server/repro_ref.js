const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const type = 'order';
  let count = 0;
  let prefix = '';
  
  const lastOrder = await prisma.salesOrder.findFirst({ 
    where: { reference: { startsWith: 'SO-' } }, 
    orderBy: { reference: 'desc' } 
  });
  
  console.log('Last Order found:', lastOrder);
  
  if (lastOrder) { 
    const lastNum = parseInt(lastOrder.reference.split('-').pop() || '0'); 
    console.log('Parsed lastNum:', lastNum);
    count = isNaN(lastNum) ? await prisma.salesOrder.count() : lastNum; 
  } else {
    console.log('No SO- order found, count remains 0');
  }
  
  prefix = 'SO';
  const nextRef = `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
  console.log('Next Ref:', nextRef);
  console.log('Total salesOrder count:', await prisma.salesOrder.count());
}

main().catch(console.error).finally(() => prisma.$disconnect());
