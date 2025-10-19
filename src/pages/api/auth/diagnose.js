// pages/api/auth/diagnose.js - 完整会话诊断版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/auth';

export default async function handler(req, res) {
  console.log('🩺 综合会话诊断API被调用');
  
  try {
    // 1. 检查环境变量
    const envInfo = {
      node_env: process.env.NODE_ENV,
      database_url: process.env.DATABASE_URL ? '已设置' : '未设置',
      nextauth_url: process.env.NEXTAUTH_URL || '未设置',
      nextauth_secret: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置',
      nextauth_url_valid: process.env.NEXTAUTH_URL ? 
        (process.env.NEXTAUTH_URL.startsWith('https://') ? 'HTTPS' : 'HTTP') : '无效'
    };

    // 2. 检查数据库连接和表结构
    await prisma.$connect();
    
    const testUser = await prisma.user.findFirst({
      take: 1
    });
    
    // 检查会话表
    let sessionTableExists = false;
    let sessionCount = 0;
    try {
      const sessions = await prisma.session.findMany({ take: 1 });
      sessionTableExists = true;
      sessionCount = await prisma.session.count();
    } catch (error) {
      console.log('❌ 会话表检查失败:', error.message);
      sessionTableExists = false;
    }

    // 3. 检查当前会话状态
    const session = await getServerSession(req, res, authOptions);
    
    // 4. 详细Cookie分析
    const cookies = req.headers.cookie || '无Cookie';
    const cookieAnalysis = {
      raw: cookies,
      hasSessionCookie: cookies.includes('next-auth.session-token'),
      sessionToken: cookies.match(/next-auth\.session-token=([^;]+)/)?.[1] || '未找到',
      hasCsrfToken: cookies.includes('next-auth.csrf-token'),
      hasCallbackUrl: cookies.includes('next-auth.callback-url'),
      cookieCount: cookies.split(';').length
    };

    // 5. 请求头分析
    const headers = {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    };

    // 6. 检查Prisma适配器状态
    const prismaAdapterInfo = {
      hasAdapter: true,
      sessionTable: sessionTableExists,
      sessionCount: sessionCount
    };

    // 7. 检查用户会话数据
    let userSessionData = null;
    if (session?.user?.id) {
      try {
        userSessionData = await prisma.session.findFirst({
          where: { userId: parseInt(session.user.id) },
          select: {
            id: true,
            expires: true,
            sessionToken: true
          }
        });
      } catch (error) {
        console.log('❌ 查询用户会话数据失败:', error.message);
      }
    }

    // 8. 构建综合诊断报告
    const diagnosis = {
      status: session ? 'SESSION_EXISTS' : 'NO_SESSION',
      timestamp: new Date().toISOString(),
      
      // 环境信息
      environment: envInfo,
      
      // 数据库状态
      database: {
        connected: true,
        hasUsers: !!testUser,
        sampleUser: testUser ? { 
          id: testUser.id, 
          email: testUser.email,
          status: testUser.status 
        } : null,
        prismaAdapter: prismaAdapterInfo
      },
      
      // 会话状态
      session: session ? {
        exists: true,
        userId: session.user?.id,
        userEmail: session.user?.email,
        userName: session.user?.name,
        userRole: session.user?.role,
        expires: session.expires,
        raw: session
      } : {
        exists: false,
        reason: '无法从请求中获取有效会话'
      },
      
      // Cookie分析
      cookies: cookieAnalysis,
      
      // 请求信息
      request: {
        method: req.method,
        url: req.url,
        headers: headers
      },
      
      // 用户会话数据
      userSession: userSessionData ? {
        exists: true,
        expires: userSessionData.expires,
        isExpired: new Date() > new Date(userSessionData.expires)
      } : {
        exists: false
      },
      
      // 问题诊断
      issues: []
    };

    // 9. 自动问题检测
    if (!session) {
      if (!cookieAnalysis.hasSessionCookie) {
        diagnosis.issues.push('❌ 未找到会话Cookie - 用户可能未登录或Cookie未设置');
      } else if (cookieAnalysis.sessionToken === '未找到') {
        diagnosis.issues.push('❌ 会话Cookie存在但无法解析Token');
      } else {
        diagnosis.issues.push('❌ 有会话Cookie但无法获取会话 - 可能Token无效或过期');
      }
    }

    if (session && userSessionData && new Date() > new Date(userSessionData.expires)) {
      diagnosis.issues.push('❌ 数据库中的会话已过期');
    }

    if (!sessionTableExists) {
      diagnosis.issues.push('❌ 数据库缺少Session表 - Prisma适配器可能未正确设置');
    }

    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://') && process.env.NODE_ENV === 'production') {
      diagnosis.issues.push('⚠️ 生产环境应使用HTTPS的NEXTAUTH_URL');
    }

    if (!process.env.NEXTAUTH_SECRET) {
      diagnosis.issues.push('❌ NEXTAUTH_SECRET未设置');
    }

    console.log('🩺 综合诊断完成:', {
      sessionExists: !!session,
      sessionUserId: session?.user?.id,
      cookieCount: cookieAnalysis.cookieCount,
      issuesCount: diagnosis.issues.length
    });

    res.status(200).json(diagnosis);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 诊断错误:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}