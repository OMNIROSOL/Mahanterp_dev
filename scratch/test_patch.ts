import axios from 'axios';

const test = async () => {
    try {
        console.log('Testing PATCH /api/delivery-notes/test');
        const res = await axios.patch('http://localhost:3001/api/delivery-notes/test', { status: 'Pending' });
        console.log('Response:', res.status, res.data);
    } catch (err: any) {
        console.log('Error:', err.response?.status, err.response?.data || err.message);
    }
};

test();
