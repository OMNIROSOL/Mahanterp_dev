import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
    const prisma = new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL
    } as any);
    console.log('Prisma initialized');
} catch (err) {
    console.error('Failed to initialize Prisma:', err);
}
