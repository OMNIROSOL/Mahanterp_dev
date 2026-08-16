require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT item_name, qty_on_hand, purchase_price, selling_price FROM master.items WHERE item_name LIKE '%315/80 R22.5 UNIVERSAL%'").then(res => { console.log(res.rows); process.exit(0); });
