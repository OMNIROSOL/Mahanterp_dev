const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function main() {
    await client.connect();

    console.log("=== INVOICES ===");
    const resInvs = await client.query(`
        SELECT id, reference, supplier_id, doc_options, description, created_at
        FROM purchase.invoices
        WHERE reference = 'PO-0018'
    `);
    console.log("Invoices:", resInvs.rows);

    console.log("=== GOODS RECEIVED NOTES ===");
    const resGrns = await client.query(`
        SELECT id, reference, supplier_id, purchase_order_id, description, received_date
        FROM purchase.goods_received_notes
        WHERE reference = 'PO-0018'
    `);
    console.log("GRNs:", resGrns.rows);

    await client.end();
}

main().catch(console.error);
