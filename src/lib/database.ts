import { PrismaClient } from '@prisma/client'

type PrismaClientType = InstanceType<typeof PrismaClient>
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

export const db: PrismaClientType = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
