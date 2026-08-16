const { Client } = require('pg');

async function test(user, password, host, port, database) {
    const client = new Client({
        user,
        password,
        host,
        port,
        database,
    });
    try {
        await client.connect();
        console.log(`SUCCESS: ${user}:${password}@${host}:${port}/${database}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`FAILED: ${user}:${password}@${host}:${port}/${database} - ${err.message}`);
        return false;
    }
}

async function run() {
    const combos = [
        ['postgres', 'postgres', '127.0.0.1', 5432, 'postgres'],
        ['postgres', 'pas', '127.0.0.1', 5432, 'postgres'],
        ['postgres', 'password', '127.0.0.1', 5432, 'postgres'],
        ['postgres', 'admin', '127.0.0.1', 5432, 'postgres'],
        ['postgres', 'postgres', 'localhost', 5432, 'postgres'],
    ];

    for (const [u, p, h, po, d] of combos) {
        if (await test(u, p, h, po, d)) break;
    }
}

run();
