// pages/api/session-debug.js - 会话调试API
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  console.log('🔍 会话调试开始');
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    headers: {
      cookie: req.headers.cookie ? '存在' : '不存在',
      host: req.headers.host,
      origin: req.headers.origin
    }
  };

  try {
    // 方法1: getServerSession (NextAuth官方)
    const session = await getServerSession(req, res, authOptions);
    debugInfo.getServerSession = session ? {
      hasSession: true,
      userId: session.user?.id,
      email: session.user?.email
    } : {
      hasSession: false,
      error: '无法获取会话'
    };

    // 方法2: getToken (中间件使用)
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    debugInfo.getToken = token ? {
      hasToken: true,
      userId: token.sub,
      email: token.email
    } : {
      hasToken: false,
      error: '无法获取Token'
    };

    // Cookie分析
    const cookies = req.headers.cookie || '';
    debugInfo.cookies = {
      raw: cookies,
      hasNextAuthCookie: cookies.includes('next-auth.session-token'),
      sessionToken: cookies.match(/next-auth\.session-token=([^;]+)/)?.[1] || '未找到',
      allCookies: cookies.split(';').map(c => c.trim())
    };

    console.log('🔍 会话调试结果:', debugInfo);
    res.status(200).json(debugInfo);

  } catch (error) {
    console.error('❌ 会话调试错误:', error);
    res.status(500).json({ 
      error: '调试失败',
      message: error.message,
      ...debugInfo
    });
  }
}