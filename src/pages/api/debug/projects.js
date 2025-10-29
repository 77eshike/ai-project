import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
export default async function handler(req, res) {
  console.log('🔍 开始调试项目API...');
  
  try {
    // 1. 检查环境变量
    console.log('🔧 环境变量检查:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? '已设置' : '未设置',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置'
    });

    // 2. 检查会话
    console.log('🔐 检查会话...');
    const session = await getServerSession(req, res, authOptions);
    console.log('会话信息:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    if (!session?.user?.id) {
      return res.status(401).json({
        success: false,
        error: '未授权访问',
        debug: {
          hasSession: !!session,
          userId: session?.user?.id
        }
      });
    }

    const userId = parseInt(session.user.id);
    console.log('👤 用户ID:', userId);

    // 3. 检查数据库连接
    console.log('🗄️ 检查数据库连接...');
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true }
      });
      console.log('✅ 数据库连接正常，用户:', user);
    } catch (dbError) {
      console.error('❌ 数据库连接失败:', dbError);
      return res.status(500).json({
        success: false,
        error: '数据库连接失败',
        details: dbError.message
      });
    }

    // 4. 检查项目表
    console.log('📋 检查项目表...');
    try {
      const projects = await prisma.project.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { projectMembers: { some: { userId: userId } } }  // 修复：members -> projectMembers
          ]
        },
        take: 5,
        select: { id: true, title: true, status: true }
      });
      
      console.log('✅ 项目查询成功，数量:', projects.length);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: userId,
            email: session.user.email
          },
          projects: projects,
          totalCount: projects.length
        },
        debug: {
          session: !!session,
          database: '正常',
          query: '成功'
        }
      });

    } catch (queryError) {
      console.error('❌ 项目查询失败:', queryError);
      return res.status(500).json({
        success: false,
        error: '项目查询失败',
        details: queryError.message,
        code: queryError.code
      });
    }

  } catch (error) {
    console.error('❌ 调试过程错误:', error);
    return res.status(500).json({
      success: false,
      error: '调试失败',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}