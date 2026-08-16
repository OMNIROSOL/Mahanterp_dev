const axios = require('axios');

async function test() {
    try {
        const response = await axios.put('http://localhost:3001/api/goods-received-notes/7230804e-024e-4a38-92d0-446d33d0309b', {
            supplierId: 'ad5154b4-2e6a-4995-ae87-1be56d0f5996',
            reference: 'PO-0018',
            description: 'test18 modified via script',
            inventoryLocation: 'Main Warehouse',
            items: []
        });
        console.log("SUCCESS:", response.data);
    } catch (err) {
        console.error("FAILED:", err.response ? { status: err.response.status, data: err.response.data } : err.message);
    }
}

test();
