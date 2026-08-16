
const axios = require('axios');
async function checkItems() {
  try {
    const res = await axios.get('http://localhost:3001/api/items');
    console.log('Items count:', res.data.length);
    if (res.data.length > 0) {
      console.log('First item:', JSON.stringify(res.data[0], null, 2));
    } else {
      console.log('No items found in API response.');
    }
  } catch (err) {
    console.error('Error fetching items:', err.message);
  }
}
checkItems();
