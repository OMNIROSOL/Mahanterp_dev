import { prisma } from '../index';

async function main() {
  const count = await prisma.currency.count();
  if (count === 0) {
    console.log('Migrating default currencies to DB...');
    await prisma.currency.createMany({
      data: [
        { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', isSystem: true, decimalPlaces: 2 },
        { code: 'USD', name: 'US Dollar', symbol: '$', isSystem: true, decimalPlaces: 2 },
        { code: 'EUR', name: 'Euro', symbol: '€', isSystem: false, decimalPlaces: 2 },
        { code: 'GBP', name: 'British Pound', symbol: '£', isSystem: false, decimalPlaces: 2 }
      ]
    });
    
    // Also create initial exchange rates for today so things don't break
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.exchangeRate.createMany({
      data: [
        { date: today, currencyCode: 'ZMW', rate: 1 },
        { date: today, currencyCode: 'USD', rate: 26 },
        { date: today, currencyCode: 'EUR', rate: 28 },
        { date: today, currencyCode: 'GBP', rate: 33 }
      ]
    });
    console.log('Successfully migrated default currencies and rates.');
  } else {
    console.log('Currencies already exist in DB. Skipping migration.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
