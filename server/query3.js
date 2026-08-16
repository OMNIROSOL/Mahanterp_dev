require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT status FROM sales.sales_orders WHERE reference = 'SO-0003'").then(res => { console.log(res.rows); process.exit(0); });
