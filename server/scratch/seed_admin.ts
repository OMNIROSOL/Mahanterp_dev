import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding admin user...');
    
    const adminEmail = 'admin@example.com';
    const plainPassword = 'password123';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // See if admin role exists
    let adminRole = await prisma.roles.findFirst({
        where: { name: 'Admin' }
    });

    if (!adminRole) {
        adminRole = await prisma.roles.create({
            data: { name: 'Admin', description: 'System Administrator' }
        });
    }

    // See if admin user exists
    let adminUser = await prisma.profiles.findUnique({
        where: { email: adminEmail }
    });

    if (adminUser) {
        console.log(`Updating existing admin: ${adminEmail}`);
        await prisma.profiles.update({
            where: { email: adminEmail },
            data: { password_hash: passwordHash, role_id: adminRole.id }
        });
    } else {
        console.log(`Creating new admin: ${adminEmail}`);
        await prisma.profiles.create({
            data: {
                email: adminEmail,
                full_name: 'Omni Admin',
                password_hash: passwordHash,
                role_id: adminRole.id
            }
        });
    }
    
    console.log(`Successfully seeded Admin user!`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${plainPassword}`);
}

main()
    .catch(e => console.error('Error during seeding:', e))
    .finally(async () => {
        await prisma.$disconnect();
    });
