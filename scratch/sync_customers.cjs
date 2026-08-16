const { Pool } = require('D:/ERP_AUTOMATION-OLD_DEV/server/node_modules/pg');

const DATABASE_URL = "postgresql://dev_erp_render_user:qBGFAoh3hE3WssttfGCkDQTfv3ojTARh@dpg-d7kqmcl7vvec739m5a4g-a.oregon-postgres.render.com/dev_erp_render?sslmode=require";

const customerNames = [
  "ZCSA SAMPLE",
  "SOLAR - DIVINE CARGO",
  "HORIZON HAULIERS LTD - NDOLA",
  "MK PETROLEUM TJS",
  "NCT KITWE",
  "GAAS TRANSPORT NDOLA",
  "TRANSGATE TRADING CHIPATA - TJS (YAKUB MUNSHI IN ZRA)",
  "BHAVANI AGRO INVESTMENT NDOLA",
  "SURYA BIOFUELS LIMITED (SG)",
  "IKHWAAN LOGISTICS LIMITED TJS",
  "YOYO FOODS LIMITED",
  "ENGENER INVESTMENT - INPART",
  "TERMITES MEAT SUPPLIERS LIMITED - KITWE",
  "MAKORA LOGISTICS AND TRANSPORT LTD MV",
  "FORTE GROUP INVESTMENTS LIMITED- KITWE",
  "STALLION MOTORS LIMITED NDOLA",
  "SARAZI LOGISTICS LIMITED - NDOLA",
  "INLAND PROPERTIES LIMITED NDOLA",
  "LANDTO RESOURCES COMPANY LIMITED - NDOLA",
  "CHAMPION LOGISTICS LIMITD - USD",
  "ALISTAIR LOGISTICS ZAMBIA LTD - USD",
  "AVALON CORPORATION LIMITED (MOIL)",
  "MOIL ENERGIES ZAMBIA LIMITED",
  "HTC - USD",
  "ATHI TRANSPORTERS LIMITED NDOLA USD",
  "Aarush Transport Ltd"
];

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('--- SYNCING ALL CUSTOMERS TO RENDER ---');

    for (let i = 0; i < customerNames.length; i++) {
      const name = customerNames[i];
      const code = `MCUST-${(i + 1).toString().padStart(4, '0')}`;
      const currency = name.includes('USD') ? 'USD' : 'ZMW';
      
      const check = await pool.query('SELECT id FROM master.customers WHERE name = $1', [name]);
      if (check.rowCount === 0) {
        console.log(`- Adding ${name}`);
        await pool.query(
          `INSERT INTO master.customers (code, name, currency, status) 
           VALUES ($1, $2, $3, $4)`,
          [code, name, currency, 'Active']
        );
      } else {
        console.log(`- Skipping ${name} (exists)`);
      }
    }

    console.log('--- CUSTOMER SYNC COMPLETED ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
