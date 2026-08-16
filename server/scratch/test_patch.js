const http = require('http');

http.get('http://localhost:3002/api/purchase-enquiries', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const pes = JSON.parse(data);
    const id = pes[0].id;
    console.log('Testing PATCH on ID:', id, 'Reference:', pes[0].reference);

    const postData = JSON.stringify({ status: 'Accepted' });
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: `/api/purchase-enquiries/${id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('PATCH Response:', data2);
      });
    });

    req.write(postData);
    req.end();
  });
});
