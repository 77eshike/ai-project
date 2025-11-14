// pages/api/system-diagnose.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🔍 [${requestId}] 系统诊断开始`);
  
  try {
    // 1. 检查环境变量
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***设置***' : '❌ 未设置',
      DATABASE_URL: process.env.DATABASE_URL ? '***设置***' : '❌ 未设置'
    };

    // 2. 检查数据库连接
    let dbCheck = { connected: false, error: null, users: [] };
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbCheck.connected = true;
      
      // 获取用户数据
      dbCheck.users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          password: true,
          createdAt: true
        }
      });
    } catch (dbError) {
      dbCheck.error = dbError.message;
    }

    // 3. 检查会话
    let session = null;
    try {
      session = await getServerSession(req, res, authOptions);
    } catch (sessionError) {
      console.warn('获取会话失败:', sessionError.message);
    }

    // 4. 检查请求信息
    const requestInfo = {
      method: req.method,
      url: req.url,
      headers: {
        cookie: req.headers.cookie ? '***存在***' : '不存在',
        authorization: req.headers.authorization ? '***存在***' : '不存在'
      }
    };

    const diagnosis = {
      requestId,
      timestamp: new Date().toISOString(),
      status: 'success',
      environment: envCheck,
      database: dbCheck,
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        } : null
      },
      request: requestInfo,
      issues: [],
      recommendations: []
    };

    // 分析问题
    if (!envCheck.NEXTAUTH_SECRET) {
      diagnosis.issues.push('❌ NEXTAUTH_SECRET 环境变量未设置');
      diagnosis.recommendations.push('立即设置 NEXTAUTH_SECRET 环境变量: openssl rand -base64 32');
    }

    if (!dbCheck.connected) {
      diagnosis.issues.push('❌ 数据库连接失败');
      diagnosis.recommendations.push('检查 DATABASE_URL 环境变量和数据库状态');
    }

    if (dbCheck.users.length === 0 && dbCheck.connected) {
      diagnosis.issues.push('❌ 数据库中没有任何用户');
      diagnosis.recommendations.push('创建至少一个用户账户');
    }

    if (!session) {
      diagnosis.issues.push('ℹ️ 当前没有有效的会话（这可能是正常的，如果您未登录）');
    }

    console.log(`✅ [${requestId}] 系统诊断完成`, {
      hasSession: !!session,
      userCount: dbCheck.users.length,
      dbConnected: dbCheck.connected
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.status(200).json(diagnosis);

  } catch (error) {
    console.error(`❌ [${requestId}] 系统诊断失败:`, error);
    
    res.status(500).json({
      requestId,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}