// src/pages/api/auth/diagnose.js - 使用正确路径
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
export default async function handler(req, res) {
  console.log('🩺 综合会话诊断API被调用');
  
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 基础环境检查
    const envInfo = {
      node_env: process.env.NODE_ENV,
      database_url: process.env.DATABASE_URL ? '已设置' : '未设置',
      nextauth_url: process.env.NEXTAUTH_URL || '未设置',
      nextauth_secret: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置',
    };

    // 检查数据库连接
    let dbConnected = false;
    let testUser = null;
    
    try {
      await prisma.$connect();
      dbConnected = true;
      testUser = await prisma.user.findFirst({ take: 1 });
    } catch (dbError) {
      console.log('❌ 数据库连接失败:', dbError.message);
      dbConnected = false;
    }

    // 检查会话状态
    const session = await getServerSession(req, res, authOptions);
    
    // Cookie分析
    const cookies = req.headers.cookie || '无Cookie';
    const cookieAnalysis = {
      hasSessionCookie: cookies.includes('next-auth.session-token'),
      cookieCount: cookies.split(';').length,
    };

    const diagnosis = {
      status: session ? 'SESSION_EXISTS' : 'NO_SESSION',
      timestamp: new Date().toISOString(),
      environment: envInfo,
      database: {
        connected: dbConnected,
        hasUsers: !!testUser,
      },
      session: session ? {
        exists: true,
        userId: session.user?.id,
        userEmail: session.user?.email,
      } : {
        exists: false,
      },
      cookies: cookieAnalysis,
      issues: [],
      recommendations: []
    };

    // 问题检测
    if (!session) {
      if (!cookieAnalysis.hasSessionCookie) {
        diagnosis.issues.push('❌ 未找到会话Cookie');
        diagnosis.recommendations.push('🔧 用户可能未登录');
      } else {
        diagnosis.issues.push('❌ 有Cookie但无法获取会话');
        diagnosis.recommendations.push('🔧 检查NEXTAUTH配置');
      }
    }

    if (!dbConnected) {
      diagnosis.issues.push('❌ 数据库连接失败');
      diagnosis.recommendations.push('🔧 检查DATABASE_URL配置');
    }

    if (!process.env.NEXTAUTH_SECRET) {
      diagnosis.issues.push('❌ NEXTAUTH_SECRET未设置');
      diagnosis.recommendations.push('🔧 设置NEXTAUTH_SECRET环境变量');
    }

    console.log('🩺 诊断完成:', { sessionExists: !!session, dbConnected });

    res.status(200).json(diagnosis);

    // 安全断开连接
    if (dbConnected) {
      await prisma.$disconnect().catch(() => {});
    }

  } catch (error) {
    console.error('❌ 诊断错误:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}