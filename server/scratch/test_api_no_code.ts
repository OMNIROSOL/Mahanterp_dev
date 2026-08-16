// using native fetch

async function run() {
  try {
    const name = `TEST-API-LOC-${Date.now()}`;
    console.log(`Creating test location via API: ${name}...`);

    const res = await fetch('http://localhost:3001/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    console.log('Response status:', res.status);
    const text = await res.text();
    console.log('Response text:', text);
  } catch (err) {
    console.error(err);
  }
}

run();
