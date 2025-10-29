// src/lib/prisma.js - 完全修复版本
import { PrismaClient } from '@prisma/client'

// 全局 Prisma 实例管理
let prismaInstance = null
let isConnecting = false
let connectionPromise = null

async function getPrismaClient() {
  if (prismaInstance) {
    return prismaInstance
  }

  if (isConnecting) {
    return connectionPromise
  }

  isConnecting = true
  connectionPromise = initPrisma()
  
  try {
    prismaInstance = await connectionPromise
    return prismaInstance
  } finally {
    isConnecting = false
  }
}

async function initPrisma() {
  try {
    console.log('🔌 初始化 Prisma 客户端...')
    
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'minimal'
    })

    await client.$connect()
    console.log('✅ Prisma 数据库连接成功')
    return client

  } catch (error) {
    console.error('❌ Prisma 数据库连接失败:', error.message)
    throw error
  }
}

// 创建真实的 Prisma 实例（用于 NextAuth 适配器）
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error'],
  errorFormat: 'minimal'
})

// 导出获取客户端的方法
export const getPrisma = getPrismaClient

// 默认导出
export default { prisma, getPrisma: getPrismaClient }