// lib/prisma.js - 修复版本
import { PrismaClient } from '@prisma/client'

// 🔧 关键修复：简化的 Prisma 配置
const globalForPrisma = globalThis

// 创建基础的 Prisma 客户端
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error'] 
    : ['query', 'error', 'warn'],
  errorFormat: 'minimal'
})

// 🔧 关键修复：移除可能导致问题的中间件
// 在生产构建时不要添加复杂的中间件

if (process.env.NODE_ENV !== 'production') {
  // 只在开发环境添加中间件
  prisma.$use(async (params, next) => {
    const start = Date.now()
    const result = await next(params)
    const end = Date.now()
    console.log(`🔧 查询 ${params.model}.${params.action} 耗时 ${end - start}ms`)
    return result
  })
  
  globalForPrisma.prisma = prisma
}

// 连接数据库
prisma.$connect()
  .then(() => console.log('✅ 数据库连接成功'))
  .catch(err => console.error('❌ 数据库连接失败:', err))

export { prisma }
export default prisma