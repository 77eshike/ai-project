// src/pages/api/auth/session.js - 完整修复版本
import { getServerSession } from 'next-auth/next';

// 🔧 动态导入认证配置
let authOptions;
try {
  const authModule = await import('../../../../lib/auth');
  authOptions = authModule.authOptions || authModule.default?.authOptions || authModule.default;
} catch (error) {
  console.warn('使用备用认证配置:', error.message);
  authOptions = {
    providers: [],
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }
  };
}

// 🔧 配置常量
const CONFIG = {
  ALLOWED_METHODS: ['GET', 'OPTIONS'],
  CACHE_CONTROL: 'private, no-cache, no-store, must-revalidate, max-age=0',
  RATE_LIMIT_WINDOW: 10000,
  RATE_LIMIT_MAX_REQUESTS: 50
};

// 🔧 请求频率跟踪
const requestTracker = new Map();

function shouldProcessRequest(identifier) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
  
  const userRequests = requestTracker.get(identifier) || [];
  const recentRequests = userRequests.filter(time => time > windowStart);
  
  if (recentRequests.length >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  requestTracker.set(identifier, recentRequests);
  
  if (requestTracker.size > 1000) {
    for (const [key, timestamps] of requestTracker.entries()) {
      const validTimestamps = timestamps.filter(time => time > windowStart);
      if (validTimestamps.length === 0) {
        requestTracker.delete(key);
      }
    }
  }
  
  return true;
}

function validateSession(session) {
  if (!session) {
    return { valid: false, reason: 'NO_SESSION' };
  }
  
  if (!session.user || !session.user.id) {
    return { valid: false, reason: 'INVALID_USER_DATA' };
  }
  
  if (typeof session.user.id !== 'string' || session.user.id.trim().length === 0) {
    return { valid: false, reason: 'INVALID_USER_ID_FORMAT' };
  }
  
  if (session.expires && new Date(session.expires) < new Date()) {
    return { valid: false, reason: 'SESSION_EXPIRED' };
  }
  
  return { valid: true, reason: 'VALID_SESSION' };
}

function normalizeUser(user) {
  if (!user) return null;
  
  const userId = user.id;
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return null;
  }
  
  return {
    id: userId,
    email: user.email || '',
    name: user.name || '用户',
    image: user.image || null,
    role: user.role || 'USER'
  };
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const requestKey = `${clientIP}-${req.headers['user-agent']}`;

  // 🔧 请求频率控制
  if (!shouldProcessRequest(requestKey)) {
    res.setHeader('X-Rate-Limited', 'true');
    res.setHeader('Retry-After', '10');
    
    return res.status(200).json({
      success: true,
      requestId,
      cached: true,
      timestamp: new Date().toISOString(),
      user: null,
      authenticated: false,
      message: '请求频率过高，请稍后重试'
    });
  }

  // 设置安全头
  res.setHeader('Cache-Control', CONFIG.CACHE_CONTROL);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', CONFIG.ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许',
      allowed: CONFIG.ALLOWED_METHODS,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const sessionValidation = validateSession(session);
    const normalizedUser = sessionValidation.valid ? normalizeUser(session.user) : null;
    
    const responseData = {
      success: true,
      requestId,
      timestamp: new Date().toISOString(),
      authenticated: sessionValidation.valid && !!normalizedUser,
      user: normalizedUser,
      expires: session?.expires,
      healthy: true,
      sessionValid: sessionValidation.valid
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] 会话API错误:`, error);
    
    res.status(200).json({
      success: false,
      error: '会话检查失败',
      requestId,
      timestamp: new Date().toISOString(),
      authenticated: false,
      user: null,
      healthy: false,
      sessionValid: false
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '10mb',
  },
};