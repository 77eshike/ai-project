// src/pages/api/auth/debug-session.js - 修复路径
import { getServerSession } from "next-auth/next";

// 🔧 根据项目结构调整导入路径
let authOptions;

try {
  // 尝试从 lib 目录导入
  authOptions = require('../../../lib/auth').authOptions;
} catch (error) {
  try {
    // 尝试从 src/lib 目录导入
    authOptions = require('../../../../src/lib/auth').authOptions;
  } catch (error2) {
    console.error('❌ 无法导入 authOptions:', error2);
    // 创建临时配置
    authOptions = {
      secret: process.env.NEXTAUTH_SECRET,
      providers: [],
      session: { strategy: 'jwt' }
    };
  }
}

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name
        },
        expires: session.expires
      } : null,
      cookies: req.headers.cookie || '无Cookie',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置'
      },
      requestInfo: {
        path: req.url,
        method: req.method,
        host: req.headers.host
      }
    };

    console.log('🔍 会话调试信息:', debugInfo);
    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('❌ 调试会话错误:', error);
    res.status(500).json({
      error: error.message,
      message: '调试会话失败'
    });
  }
}