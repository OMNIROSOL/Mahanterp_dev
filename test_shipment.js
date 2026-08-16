async function test() {
    try {
        console.log('Fetching shipments...');
        const res1 = await fetch('http://localhost:3002/api/procurement/shipments');
        const shipments = await res1.json();
        
        const shp3 = shipments.find(s => s.reference === 'SHP-0003');
        if (!shp3) {
            console.log('SHP-0003 not found!');
            return;
        }
        
        console.log('Found SHP-0003, ID:', shp3.id);
        console.log('Current status:', shp3.status);
        
        shp3.status = 'In Transit';
        
        delete shp3.supplier;
        shp3.items = shp3.items.map(i => ({
            purchaseOrderId: i.purchaseOrderId,
            itemId: i.itemId,
            description: i.description,
            qty: i.qty,
            unitPrice: i.unitPrice,
            totalAmount: i.totalAmount,
            containerNo: i.containerNo
        }));
        
        console.log('Updating SHP-0003 with stripped payload...');
        const res2 = await fetch(`http://localhost:3002/api/procurement/shipments/${shp3.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shp3)
        });
        
        const text = await res2.text();
        console.log('Status:', res2.status);
        console.log('Response:', text);
    } catch (e) {
        console.error(e);
    }
}

test();
