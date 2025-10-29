// /opt/ai-project/src/pages/api/auth/session.js - 增强版本
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../lib/auth';

// 会话检查缓存（防止频繁查询）
const sessionCache = new Map();
const CACHE_DURATION = 5000; // 5秒缓存

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const requestId = Math.random().toString(36).substr(2, 9);
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    console.log(`🔐 [${requestId}] 会话检查请求:`, {
      ip: clientIP,
      userAgent: req.headers['user-agent']?.substr(0, 50),
      hasCookies: !!req.headers.cookie,
      cacheKey: req.headers.cookie ? 'has-cookies' : 'no-cookies'
    });

    // 简单的缓存机制防止频繁查询
    const cacheKey = req.headers.cookie || 'no-cookies';
    const cachedSession = sessionCache.get(cacheKey);
    
    if (cachedSession && (Date.now() - cachedSession.timestamp < CACHE_DURATION)) {
      console.log(`⚡ [${requestId}] 使用缓存会话数据`);
      return res.status(200).json({
        success: true,
        authenticated: true,
        user: cachedSession.data.user,
        expires: cachedSession.data.expires,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // 获取会话
    const session = await getServerSession(req, res, authOptions);
    
    const sessionData = {
      authenticated: !!session,
      user: session?.user || null,
      expires: session?.expires || null
    };

    console.log(`🔐 [${requestId}] 会话状态:`, {
      authenticated: sessionData.authenticated,
      userId: session?.user?.id || 'null',
      email: session?.user?.email || 'null',
      expires: session?.expires || 'null'
    });

    // 缓存有效会话
    if (sessionData.authenticated && sessionData.user) {
      sessionCache.set(cacheKey, {
        data: sessionData,
        timestamp: Date.now()
      });
      
      // 限制缓存大小
      if (sessionCache.size > 100) {
        const firstKey = sessionCache.keys().next().value;
        sessionCache.delete(firstKey);
      }
    }

    // 构建响应
    const response = {
      success: true,
      ...sessionData,
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    };

    // 设置缓存头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ 会话API错误:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code
    });

    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.message.includes('JWT')) {
      statusCode = 401;
      errorMessage = 'Invalid token';
    } else if (error.message.includes('database') || error.message.includes('prisma')) {
      statusCode = 503;
      errorMessage = 'Service temporarily unavailable';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      authenticated: false,
      user: null,
      timestamp: new Date().toISOString()
    });
  }
}

// 定期清理过期缓存
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of sessionCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION * 2) {
      sessionCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {
    console.log(`🧹 清理了 ${cleanedCount} 个过期会话缓存`);
  }
}, 60000); // 每分钟清理一次