// src/lib/prisma.js
import { PrismaClient } from '@prisma/client'

// 防止热重载时创建多个 Prisma 实例
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma