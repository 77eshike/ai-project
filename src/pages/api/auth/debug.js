// src/pages/api/auth/debug.js - 详细调试端点
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    
    // 环境信息
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置',
      urlsMatch: process.env.NEXTAUTH_URL === process.env.NEXT_PUBLIC_APP_URL
    },
    
    // 请求信息
    request: {
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent']?.substring(0, 30) + '...'
      }
    },
    
    // Cookie 信息
    cookies: {
      all: req.cookies,
      count: Object.keys(req.cookies).length,
      hasSessionToken: !!req.cookies['next-auth.session-token'],
      hasSecureSessionToken: !!req.cookies['__Secure-next-auth.session-token']
    },
    
    // 会话信息
    session: null,
    
    // 问题诊断
    diagnostics: {
      hasAuthOptions: !!authOptions,
      hasProviders: authOptions?.providers?.length > 0,
      sessionStrategy: authOptions?.session?.strategy
    }
  };

  try {
    // 尝试获取会话
    const session = await getServerSession(req, res, authOptions);
    debugInfo.session = session ? {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      expires: session.expires
    } : { exists: false };
    
    console.log('🐛 Auth Debug Info:', {
      hasSession: !!session,
      cookieCount: debugInfo.cookies.count,
      urlsMatch: debugInfo.environment.urlsMatch
    });

    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('❌ Auth Debug Error:', error);
    
    debugInfo.error = {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    res.status(500).json(debugInfo);
  }
}