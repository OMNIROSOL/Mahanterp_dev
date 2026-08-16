const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Prisma Models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
prisma.$disconnect();
