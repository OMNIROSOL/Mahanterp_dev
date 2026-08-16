const { Pool } = require('D:/ERP_AUTOMATION-OLD_DEV/server/node_modules/pg');

const DATABASE_URL = "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require";

const accounts = [
  { "code": "1200", "name": "AIRTEL ZMW - MAHANT", "type": "Asset", "isPaymentAccount": true },
  { "code": "1201", "name": "ALTUS - AIRTEL MONEY", "type": "Asset", "isPaymentAccount": true },
  { "code": "1202", "name": "CASH AT BANK", "type": "Asset", "isPaymentAccount": true },
  { "code": "1100", "name": "PETTY CASH", "type": "Asset", "isPaymentAccount": true },
  { "code": "2100", "name": "Credit Card", "type": "Liability", "isPaymentAccount": true },
  { "code": "4000", "name": "Sales", "type": "Income", "isPaymentAccount": false },
  { "code": "5000", "name": "Cost of Goods Sold", "type": "Expense", "isPaymentAccount": false },
  { "code": "1300", "name": "Accounts Receivable", "type": "Asset", "isPaymentAccount": false },
  { "code": "2000", "name": "Accounts Payable", "type": "Liability", "isPaymentAccount": false },
  { "code": "9999", "name": "Suspense", "type": "Asset", "isPaymentAccount": false },
  { "code": "3000", "name": "Retained earnings", "type": "Equity", "isPaymentAccount": false }
];

const items = [
  { "itemCode": "MI0084", "itemName": "315/80 R22.5 UNIVERSAL", "description": "Universal Truck Tyre", "unitName": "Each", "valuationMethod": "WeightedAverage" },
  { "itemCode": "MI0323", "itemName": "WHEEL STUD HENDRED", "description": "Hendred Wheel Stud", "unitName": "Each", "valuationMethod": "WeightedAverage" },
  { "itemCode": "MI0848", "itemName": "DIN180MF 12V BATTERY", "description": "12V 68032MF Battery", "unitName": "Each", "valuationMethod": "WeightedAverage" }
];

const suppliers = [
  { "name": "AUTO SPARES LTD", "code": "SUP001", "status": "Active", "currency": "ZMW", "email": "info@autospares.com" },
  { "name": "TRUCK TECH GLOBAL", "code": "SUP002", "status": "Active", "currency": "USD", "email": "sales@trucktech.com" },
  { "name": "LUBRICANTS DIRECT", "code": "SUP003", "status": "Active", "currency": "ZMW", "email": "orders@lubricants.com" }
];

const customers = [
  { "code": "CUST-0001", "name": "TEST", "currency": "ZMW", "status": "Active", "billingAddress": "KENYA" },
  { "code": "CUST-0002", "name": "ABCD - USD", "currency": "USD", "status": "Active", "billingAddress": "KENYA" },
  { "code": "CUST-0003", "name": "STALLION MOTORS LIMITED NDOLA", "currency": "ZMW", "status": "Active", "billingAddress": "Plot 1234, Industrial Area, Ndola" },
  { "code": "CUST-0004", "name": "SARAZI LOGISTICS LIMITED - NDOLA", "currency": "ZMW", "status": "Active", "billingAddress": "Main Street, Ndola" }
];

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('--- RENDERING DATA MIGRATION ---');

    console.log('Migrating Accounts...');
    for (const acc of accounts) {
      await pool.query(
        `INSERT INTO finance.chart_of_accounts (code, name, account_type, is_payment_account) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (code) DO UPDATE SET name = $2, account_type = $3, is_payment_account = $4`,
        [acc.code, acc.name, acc.type, acc.isPaymentAccount]
      );
    }

    console.log('Migrating Items...');
    for (const item of items) {
      await pool.query(
        `INSERT INTO master.items (item_code, item_name, description, unit_name, valuation_method) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (item_code) DO UPDATE SET item_name = $2, description = $3, unit_name = $4, valuation_method = $5`,
        [item.itemCode, item.itemName, item.description, item.unitName, item.valuationMethod]
      );
    }

    console.log('Migrating Suppliers...');
    for (const sup of suppliers) {
      await pool.query(
        `INSERT INTO master.suppliers (code, name, email, currency, status) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (code) DO UPDATE SET name = $2, email = $3, currency = $4, status = $5`,
        [sup.code, sup.name, sup.email, sup.currency, sup.status]
      );
    }

    console.log('Migrating Customers...');
    for (const cust of customers) {
      await pool.query(
        `INSERT INTO master.customers (code, name, currency, status, billing_address) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (code) DO UPDATE SET name = $2, currency = $3, status = $4, billing_address = $5`,
        [cust.code, cust.name, cust.currency, cust.status, cust.billingAddress]
      );
    }

    console.log('--- MIGRATION TO RENDER COMPLETED ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
