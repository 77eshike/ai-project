// pages/api/auth/session-check.js - 增强版本
import { getCurrentUser, getCacheStats } from '../../../lib/session';

// 请求频率限制
const requestCache = new Map();
const RATE_LIMIT_WINDOW = 5000; // 5秒窗口
const MAX_REQUESTS_PER_WINDOW = 10; // 每个窗口最多10次请求

export default async function handler(req, res) {
  // 设置响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const requestId = Math.random().toString(36).substr(2, 9);

    // 简单的频率限制
    const rateLimitKey = `${clientIP}-session-check`;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // 清理过期的请求记录
    for (const [key, timestamps] of requestCache.entries()) {
      requestCache.set(key, timestamps.filter(time => time > windowStart));
      if (requestCache.get(key).length === 0) {
        requestCache.delete(key);
      }
    }

    // 检查频率限制
    const requestTimestamps = requestCache.get(rateLimitKey) || [];
    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn(`🚫 频率限制: ${clientIP} - 会话检查请求过于频繁`);
      return res.status(429).json({
        success: false,
        error: '请求过于频繁，请稍后重试',
        retryAfter: Math.ceil((requestTimestamps[0] + RATE_LIMIT_WINDOW - now) / 1000)
      });
    }

    // 记录本次请求
    requestTimestamps.push(now);
    requestCache.set(rateLimitKey, requestTimestamps);

    console.log(`🔐 [${requestId}] 会话健康检查请求`, {
      ip: clientIP,
      userAgent: userAgent.substring(0, 50),
      hasCookies: !!req.headers.cookie,
      requestCount: requestTimestamps.length
    });

    // 获取当前用户
    const user = await getCurrentUser(req, res);
    
    if (!user) {
      console.log(`❌ [${requestId}] 会话检查: 无效会话`);
      return res.status(200).json({
        success: false,
        valid: false,
        sessionExpired: true,
        error: '会话无效或已过期',
        timestamp: new Date().toISOString(),
        shouldRedirect: true,
        redirectTo: '/auth/signin?reason=session_expired'
      });
    }

    // 检查用户状态
    if (user.status && user.status !== 'ACTIVE') {
      console.warn(`⛔ [${requestId}] 会话检查: 用户状态异常`, {
        userId: user.id,
        status: user.status
      });
      
      return res.status(200).json({
        success: false,
        valid: false,
        sessionExpired: true,
        error: `账户已被${user.status === 'BLOCKED' ? '禁用' : '暂停'}`,
        timestamp: new Date().toISOString(),
        shouldRedirect: true,
        redirectTo: '/auth/signin?reason=account_suspended'
      });
    }

    console.log(`✅ [${requestId}] 会话检查: 有效会话`, { 
      userId: user.id, 
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin
    });

    // 构建响应数据
    const responseData = {
      success: true,
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium,
        image: user.image
      },
      permissions: {
        canRead: true,
        canWrite: true,
        canDelete: user.isAdmin,
        canManageUsers: user.isAdmin
      },
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
      cacheInfo: process.env.NODE_ENV === 'development' ? getCacheStats() : undefined
    };

    // 设置缓存头 - 不建议缓存会话检查
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Session-Valid', 'true');
    res.setHeader('X-User-ID', user.id);

    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ 会话检查错误:', {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // 分类错误处理
    let statusCode = 500;
    let errorMessage = '会话检查失败';
    let shouldRetry = false;

    if (error.code?.startsWith('P')) {
      // Prisma 数据库错误
      statusCode = 503;
      errorMessage = '服务暂时不可用';
      shouldRetry = true;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = '请求超时';
      shouldRetry = true;
    }

    res.status(statusCode).json({
      success: false,
      valid: false,
      error: errorMessage,
      shouldRetry,
      timestamp: new Date().toISOString()
    });
  }
}

// 定期清理请求缓存
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  let cleanedCount = 0;

  for (const [key, timestamps] of requestCache.entries()) {
    const validTimestamps = timestamps.filter(time => time > windowStart);
    if (validTimestamps.length === 0) {
      requestCache.delete(key);
      cleanedCount++;
    } else {
      requestCache.set(key, validTimestamps);
    }
  }

  if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {
    console.log(`🧹 清理了 ${cleanedCount} 个过期的频率限制记录`);
  }
}, 60000); // 每分钟清理一次