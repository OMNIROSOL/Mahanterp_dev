import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const invs = await prisma.invoices.findMany({
    include: { items: true }
  });

  for (const i of invs) {
    const totalDiscount = (i.items || []).reduce((sum, item) => {
      const lineExTax = (Number(item.qty) * Number(item.unitPrice)) || 0;
      const discountVal = parseFloat(item.discount as string) || 0;
      const discountAmount = lineExTax * (discountVal / 100);
      return sum + discountAmount;
    }, 0);
    if (totalDiscount > 0) {
      console.log(`Ref: ${i.reference}, Discount Amount: ${totalDiscount}, Raw Items:`, i.items.map(it => ({ qty: it.qty, price: it.unitPrice, disc: it.discount })));
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
