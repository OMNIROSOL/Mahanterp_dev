import fs from 'fs';

async function main() {
    const res = await fetch('http://localhost:3002/api/procurement/shipments');
    const shipments = await res.json();
    const shp1 = shipments.find(s => s.reference === 'SHP-0001');

    const res2 = await fetch('http://localhost:3002/api/goods-received-notes');
    const grns = await res2.json();
    const relatedGrns = grns.filter(g => g.description && g.description.includes('SHP-0001'));

    fs.writeFileSync('D:\\erp\\scratch_fetch.json', JSON.stringify({ shp1: shp1?.items, relatedGrns }, null, 2), 'utf8');
}

main().catch(console.error);
