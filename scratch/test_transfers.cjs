const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testTransfers() {
  console.log('Testing Inventory Transfer routes...');
  
  try {
    // 1. Test POST
    console.log('\n1. Creating a test transfer...');
    const createRes = await axios.post(`${API_BASE}/inventory-transfers`, {
      reference: `TR-TEST-${Date.now()}`,
      date: '11.05.2026',
      fromLocation: 'General',
      toLocation: 'Warehouse A',
      description: 'Test transfer from scratch script',
      status: 'Draft',
      items: [
        { inventoryItem: 'TEST-001 - Test Item', qty: 10 }
      ]
    });
    console.log('Success! Created ID:', createRes.data.id);

    // 2. Test GET All
    console.log('\n2. Fetching all transfers...');
    const getAllRes = await axios.get(`${API_BASE}/inventory-transfers`);
    console.log(`Success! Found ${getAllRes.data.length} transfers.`);

    // 3. Test GET One
    console.log(`\n3. Fetching transfer by ID (${createRes.data.id})...`);
    const getOneRes = await axios.get(`${API_BASE}/inventory-transfers/${createRes.data.id}`);
    console.log('Success! Reference:', getOneRes.data.reference);

  } catch (err) {
    console.error('Test failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testTransfers();
