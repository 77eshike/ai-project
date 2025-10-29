// pages/api/debug/database.js
export default async function handler(req, res) {
  try {
    const prisma = await prismaManager.getClient();
    
    // 测试连接
    const connectionTest = await prisma.$queryRaw`SELECT 1 as status`;
    
    // 获取表信息
    const projectCount = await prisma.project.count();
    const userCount = await prisma.user.count();
    const knowledgeCount = await prisma.knowledge.count();
    
    // 检查最近的项目
    const recentProjects = await prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, status: true, createdAt: true }
    });

    res.status(200).json({
      success: true,
      data: {
        database: {
          connection: 'healthy',
          testResult: connectionTest
        },
        counts: {
          projects: projectCount,
          users: userCount,
          knowledge: knowledgeCount
        },
        recentProjects,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? '***' : 'not set'
        }
      }
    });

  } catch (error) {
    console.error('❌ 数据库诊断失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}