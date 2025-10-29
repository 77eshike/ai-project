import { PrismaClient } from '@prisma/client'

// src/lib/prisma-safe.js - 安全版本


class PrismaManager {
  constructor() {
    this.prisma = null
    this.isConnecting = false
    this.connectionPromise = null
  }

  async getClient() {
    // 如果已经有客户端，直接返回
    if (this.prisma) {
      return this.prisma
    }

    // 如果正在连接中，等待连接完成
    if (this.isConnecting) {
      return this.connectionPromise
    }

    // 开始连接
    this.isConnecting = true
    this.connectionPromise = this.connect()
    
    return this.connectionPromise
  }

  async connect() {
    try {
      console.log('🔌 初始化 Prisma 客户端...')
      
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        errorFormat: 'minimal'
      })

      // 测试连接
      await this.prisma.$connect()
      console.log('✅ Prisma 数据库连接成功')

      this.isConnecting = false
      return this.prisma

    } catch (error) {
      console.error('❌ Prisma 数据库连接失败:', error.message)
      this.isConnecting = false
      this.prisma = null
      throw error
    }
  }

  async healthCheck() {
    try {
      const client = await this.getClient()
      await client.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('❌ Prisma 健康检查失败:', error.message)
      return false
    }
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect()
      this.prisma = null
    }
  }
}

// 创建单例实例
const prismaManager = new PrismaManager()

export default prismaManager