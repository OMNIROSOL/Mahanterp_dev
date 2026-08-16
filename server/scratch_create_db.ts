import { Client } from 'pg';

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:1234@localhost:5432/postgres'
    });
    
    await client.connect();
    
    try {
        await client.query('CREATE DATABASE mahant');
        console.log('Database "mahant" created successfully');
    } catch (e: any) {
        if (e.code === '42P04') {
            console.log('Database already exists');
        } else {
            console.error('Error creating database:', e);
        }
    } finally {
        await client.end();
    }
}

main();
