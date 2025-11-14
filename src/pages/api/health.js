// pages/api/health.js - 完整系统健康检查
import { prisma } from '../../lib/prisma'

export default async function handler(req, res) {
  const healthReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {}
  }

  try {
    // 数据库健康检查
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStart

    healthReport.services.database = {
      status: 'healthy',
      responseTime: `${dbResponseTime}ms`,
      details: 'PostgreSQL connection established'
    }

    // 环境变量检查
    healthReport.services.environment = {
      status: 'healthy',
      details: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nodeEnv: process.env.NODE_ENV
      }
    }

    // 内存使用情况
    const memoryUsage = process.memoryUsage()
    healthReport.system = {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      uptime: `${Math.round(process.uptime())}s`
    }

    // 总体状态
    const allHealthy = Object.values(healthReport.services).every(
      service => service.status === 'healthy'
    )
    
    healthReport.status = allHealthy ? 'healthy' : 'degraded'
    healthReport.message = allHealthy 
      ? '所有服务运行正常' 
      : '部分服务存在问题'

    console.log('🔍 系统健康检查完成:', healthReport.status)
    res.status(allHealthy ? 200 : 503).json(healthReport)

  } catch (error) {
    healthReport.status = 'unhealthy'
    healthReport.error = error.message
    healthReport.services.database = {
      status: 'unhealthy',
      error: error.message
    }

    console.error('❌ 系统健康检查失败:', error)
    res.status(503).json(healthReport)
  }
}