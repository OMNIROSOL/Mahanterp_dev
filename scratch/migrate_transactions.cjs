const { Pool } = require('D:/ERP_AUTOMATION-OLD_DEV/server/node_modules/pg');

const DATABASE_URL = "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require";

const invoices = [
  { issueDate: '2026-03-08', reference: '12248', customer: 'HORIZON HAULIERS LTD - NDOLA', description: 'SPARE DN12248 #PO PENDING', currency: 'ZMW', amount: 580.00, items: [{ item: 'Spare Part DN12248', qty: 1, unitPrice: 580 }] },
  { issueDate: '2026-03-01', reference: '12226', customer: 'GAAS TRANSPORT NDOLA', description: 'BATTERY DN12226 DN12247 DN11173 #PO5002', currency: 'ZMW', amount: 14930.00, items: [{ item: 'Battery DN12226', qty: 2, unitPrice: 7465 }] },
  { issueDate: '2027-02-20', reference: '6666', customer: 'ENGENER INVESTMENT - INPART', description: 'SPARES DN#6666', currency: 'ZMW', amount: 37840.00, items: [{ item: 'SPARES DN#6666', qty: 1, unitPrice: 37840 }] },
  { issueDate: '2026-02-25', reference: 'INV0010007301/2868', customer: 'TERMITES MEAT SUPPLIERS LIMITED - KITWE', description: 'BATTERY KDN00791', currency: 'ZMW', amount: 13600.00, items: [{ item: 'Battery KDN00791', qty: 2, unitPrice: 6800 }] },
  { issueDate: '2026-02-28', reference: '6657', customer: 'TRANSGATE TRADING CHIPATA - TJS (YAKUB MUNSHI IN ZRA)', description: 'SPARES DN#6657 PRICE CONFIRM', currency: 'ZMW', amount: 0.00, items: [{ item: 'Spares DN6657', qty: 1, unitPrice: 0 }] }
];

const quotes = [
  { issueDate: '2026-02-18', reference: 'SQ-0001', customer: 'STALLION MOTORS LIMITED NDOLA', description: 'SPARES QUOTE', currency: 'ZMW', amount: 5800.00, status: 'Active' },
  { issueDate: '2026-02-18', reference: 'SQ-0004', customer: 'SARAZI LOGISTICS LIMITED - NDOLA', description: 'SPARES QUOTE', currency: 'ZMW', amount: 10440.00, status: 'Accepted' }
];

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('--- ADVANCED DATA MIGRATION ---');

    // 1. Fetch Mappings
    console.log('Fetching Customer and Item mappings...');
    const custRes = await pool.query('SELECT id, name FROM master.customers');
    const itemRes = await pool.query('SELECT id, item_code FROM master.items');
    
    const customerMap = {};
    custRes.rows.forEach(r => customerMap[r.name] = r.id);
    
    const itemMap = {};
    itemRes.rows.forEach(r => itemMap[r.item_code] = r.id);

    // 2. Migrate Invoices
    console.log('Migrating Invoices...');
    for (const inv of invoices) {
      const customerId = customerMap[inv.customer];
      if (!customerId) {
        console.warn(`Skipping invoice ${inv.reference}: Customer "${inv.customer}" not found.`);
        continue;
      }

      console.log(`- Invoice ${inv.reference}`);
      const invRes = await pool.query(
        `INSERT INTO sales.invoices (reference, issue_date, customer_id, grand_total, balance_due, status) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (reference) DO UPDATE SET grand_total = $4, balance_due = $5 
         RETURNING id`,
        [inv.reference, inv.issueDate, customerId, inv.amount, inv.amount, 'Unpaid']
      );
      
      const invoiceId = invRes.rows[0].id;

      // Migrate Invoice Items
      for (const ii of inv.items) {
        let itemId = itemMap[ii.item];
        if (!itemId) {
          console.log(`  Adding missing item: ${ii.item}`);
          const itemCode = ii.item.replace(/\s+/g, '-').toUpperCase().substring(0, 50);
          const itemRes = await pool.query(
            `INSERT INTO master.items (item_code, item_name, valuation_method) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (item_code) DO UPDATE SET item_name = $2 
             RETURNING id`,
            [itemCode, ii.item, 'FIFO']
          );
          itemId = itemRes.rows[0].id;
          itemMap[ii.item] = itemId; // Cache for next use
        }
        await pool.query(
          `INSERT INTO sales.invoice_items (invoice_id, item_id, qty, unit_price, total_amount) 
           VALUES ($1, $2, $3, $4, $5)`,
          [invoiceId, itemId, ii.qty, ii.unitPrice, ii.qty * ii.unitPrice]
        );
      }
    }

    console.log('--- MIGRATION COMPLETED ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
