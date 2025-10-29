// pages/api/debug/middleware-check.js
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: true
  });

  const debugInfo = {
    timestamp: new Date().toISOString(),
    middlewareCheck: {
      hasToken: !!token,
      userId: token?.sub,
      tokenData: token ? {
        id: token.id,
        email: token.email,
        name: token.name
      } : null
    },
    requestInfo: {
      method: req.method,
      url: req.url,
      host: req.headers.host,
      cookies: req.headers.cookie ? req.headers.cookie.split(';').map(c => c.trim()) : []
    },
    environment: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置'
    }
  };

  console.log('🔧 中间件调试信息:', debugInfo);
  res.status(200).json(debugInfo);
}