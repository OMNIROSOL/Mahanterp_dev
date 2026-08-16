import axios from 'axios';

async function check() {
  try {
    const res = await axios.get('http://localhost:3001/api/purchase-invoices');
    const inv = res.data.find((i: any) => i.reference === 'PO-0016');
    console.log('API Response for PO-0016:', inv ? { ref: inv.reference, disc: inv.discount } : 'Not found');
  } catch (err: any) {
    console.error('API Error:', err.message);
  }
}

check();
