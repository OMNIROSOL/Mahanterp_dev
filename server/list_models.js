const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Prisma Models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
process.exit(0);
