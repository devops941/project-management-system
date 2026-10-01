import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient instance for the whole Express process.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__pmsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__pmsPrisma = prisma;
}

export async function connectDatabase() {
  await prisma.$connect();
  return prisma;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
