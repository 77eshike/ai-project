// src/pages/api/auth/health.js - 修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';

export default async function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: '方法不允许',
      allowed: ['GET']
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasUrl: !!process.env.NEXTAUTH_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL
      },
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        } : null
      },
      cookies: {
        sessionToken: !!req.cookies['next-auth.session-token'],
        secureSessionToken: !!req.cookies['__Secure-next-auth.session-token'],
        allCookies: Object.keys(req.cookies)
      },
      request: {
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers.host,
          'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
        }
      }
    };

    console.log('🔍 认证健康检查:', {
      status: healthInfo.status,
      sessionExists: healthInfo.session.exists,
      hasCookies: healthInfo.cookies.allCookies.length > 0
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json(healthInfo);
  } catch (error) {
    console.error('❌ 认证健康检查错误:', error);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}