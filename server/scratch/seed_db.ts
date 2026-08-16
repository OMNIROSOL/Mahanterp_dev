import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const mockLocations = [
  { name: 'Copperbelt Upcountry' },
  { name: 'KITWE' },
  { name: 'NDOLA - SPARES' },
  { name: 'Solwezi' },
  { name: 'UDDIT SHOP - CAIRO' },
  { name: 'UPCOUNTRY' },
  { name: 'WAREHOUSE' },
  { name: 'Z-SUSPENSE' },
  { name: 'Main Warehouse' }
];

const mockCustomers = [
  { code: 'CUST-0001', name: 'STALLION MOTORS LIMITED NDOLA', currency: 'ZMW', billingAddress: 'Plot 1234, Industrial Area, Ndola', status: 'Unpaid', balance: 5800.00, creditDays: 30, salesPerson: 'John Doe', tpin: '1000123456' },
  { code: 'CUST-0002', name: 'SARAZI LOGISTICS LIMITED - NDOLA', currency: 'ZMW', billingAddress: 'Main Street, Ndola', status: 'Unpaid', balance: 10440.00, creditDays: 15, salesPerson: 'Jane Smith', tpin: '1000987654' },
  { code: 'CUST-0003', name: 'INLAND PROPERTIES LIMITED NDOLA', currency: 'ZMW', billingAddress: 'Broadway, Ndola', status: 'Paid', balance: 0.00, creditDays: 45, salesPerson: 'Alice Johnson', tpin: '1000554433' },
  { code: 'CUST-0004', name: 'LANDTO RESOURCES COMPANY LIMITED - NDOLA', currency: 'ZMW', billingAddress: 'President Avenue, Ndola', status: 'Paid', balance: 0.00, creditDays: 30, salesPerson: 'John Doe', tpin: '1000223344' },
  { code: 'CUST-0005', name: 'CHAMPION LOGISTICS LIMITD - USD', currency: 'USD', billingAddress: 'Copperbelt, Zambia', status: 'Paid', balance: 0.00, creditDays: 30, salesPerson: 'Jane Smith', tpin: '1000445566' },
  { code: 'CUST-0006', name: 'ALISTAIR LOGISTICS ZAMBIA LTD - USD', currency: 'USD', billingAddress: 'Lusaka Road, Ndola', status: 'Paid', balance: 0.00, creditDays: 30, salesPerson: 'Alice Johnson', tpin: '1000667788' },
  { code: 'CUST-0007', name: 'AVALON CORPORATION LIMITED (MOIL)', currency: 'ZMW', billingAddress: 'Plot 55, Ndola', status: 'Paid', balance: 0.00, creditDays: 30, salesPerson: 'John Doe', tpin: '1000778899' },
  { code: 'CUST-0008', name: 'MOIL ENERGIES ZAMBIA LIMITED', currency: 'ZMW', billingAddress: 'Plot 56, Ndola', status: 'Paid', balance: 0.00, creditDays: 30, salesPerson: 'Jane Smith', tpin: '1000889900' },
  { code: 'CUST-0009', name: 'HTC - USD', currency: 'USD', billingAddress: 'Highway 1, Ndola', status: 'Paid', balance: 0.00, creditDays: 30, salesPerson: 'Alice Johnson', tpin: '1000990011' },
  { code: 'CUST-0010', name: 'ATHI TRANSPORTERS LIMITED NDOLA USD', currency: 'USD', billingAddress: 'Transport Way, Ndola', status: 'Paid', balance: 0.00, creditDays: 30, salesPerson: 'John Doe', tpin: '1000001122' }
];

const mockItems = [
  { itemCode: 'MI0084', itemName: '315/80 R22.5 UNIVERSAL', description: 'Universal Truck Tyre', unitName: 'Each', qtyOnHand: 15, avgCost: 2100, category: 'Tyres', valuationMethod: 'WeightedAverage' },
  { itemCode: 'MI0323', itemName: 'WHEEL STUD HENDRED', description: 'Hendred Wheel Stud', unitName: 'Each', qtyOnHand: 120, avgCost: 35, category: 'Spare Parts', valuationMethod: 'WeightedAverage' },
  { itemCode: 'MI0848', itemName: 'DIN180MF 12V BATTERY', description: '12V 68032MF Battery', unitName: 'Each', qtyOnHand: 42, avgCost: 5800, category: 'Batteries', valuationMethod: 'WeightedAverage' },
  { itemCode: 'MI0234', itemName: 'WHEEL NUT HENDRED', description: 'Hendred Wheel Nut', unitName: 'Each', qtyOnHand: 300, avgCost: 10, category: 'Spare Parts', valuationMethod: 'WeightedAverage' },
  { itemCode: 'MI0001', itemName: 'Engine Oil 20L', description: 'Synthetic Engine Oil 20L', unitName: 'Each', qtyOnHand: 85, avgCost: 2800, category: 'Lubricants', valuationMethod: 'WeightedAverage' }
];

async function run() {
  try {
    console.log('Seeding local database with self-contained mock data...');

    // 1. Seed Locations
    console.log('Seeding Locations...');
    for (const loc of mockLocations) {
      const code = loc.name.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + Math.floor(100 + Math.random() * 900);
      await prisma.location.upsert({
        where: { name: loc.name },
        update: {},
        create: {
          name: loc.name,
          code: code
        }
      });
    }

    // 2. Seed Customers
    console.log('Seeding Customers...');
    for (const cust of mockCustomers) {
      await prisma.customer.upsert({
        where: { code: cust.code },
        update: {
          name: cust.name,
          currency: cust.currency,
          billingAddress: cust.billingAddress,
          status: cust.status,
          balance: cust.balance,
          creditDays: cust.creditDays,
          salesPerson: cust.salesPerson,
          tpin: cust.tpin
        },
        create: {
          code: cust.code,
          name: cust.name,
          currency: cust.currency,
          billingAddress: cust.billingAddress,
          status: cust.status,
          balance: cust.balance,
          creditDays: cust.creditDays,
          salesPerson: cust.salesPerson,
          tpin: cust.tpin
        }
      });
    }

    // 3. Seed Units
    console.log('Seeding Units...');
    const defaultUnits = ['Each', 'Pcs', 'Kg', 'Liters', 'Boxes'];
    for (const name of defaultUnits) {
      await prisma.unit.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} Unit of Measure` }
      });
    }

    // 4. Seed Categories
    console.log('Seeding Categories...');
    const defaultCategories = ['Tyres', 'Spare Parts', 'Batteries', 'Lubricants'];
    for (const name of defaultCategories) {
      await prisma.itemCategory.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} Item Category` }
      });
    }

    // 5. Seed Items
    console.log('Seeding Items...');
    for (const item of mockItems) {
      await prisma.item.upsert({
        where: { itemCode: item.itemCode },
        update: {
          itemName: item.itemName,
          description: item.description,
          unitName: item.unitName,
          qtyOnHand: item.qtyOnHand,
          sellingPrice: item.avgCost * 1.2,
          purchasePrice: item.avgCost,
          valuationMethod: item.valuationMethod,
          category: item.category
        },
        create: {
          itemCode: item.itemCode,
          itemName: item.itemName,
          description: item.description,
          unitName: item.unitName,
          qtyOnHand: item.qtyOnHand,
          sellingPrice: item.avgCost * 1.2,
          purchasePrice: item.avgCost,
          valuationMethod: item.valuationMethod,
          category: item.category
        }
      });
    }

    console.log('✅ Seeding complete!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
