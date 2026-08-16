const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function main() {
    await client.connect();
    const res = await client.query(`SELECT id, item_name FROM master.items LIMIT 5`);
    console.log("Items:", res.rows);
    await client.end();
}

main().catch(console.error);
