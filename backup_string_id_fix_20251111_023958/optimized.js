// pages/api/session/optimized.js - 终极优化版本
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';
import sessionCache from '../../../lib/session-cache';

// 🔧 配置常量
const CONFIG = {
  CACHE_TTL: 5 * 60 * 1000, // 5分钟缓存
  CACHE_PREFIX: 'user-session-',
  ALLOWED_METHODS: ['GET'],
  SESSION_TIMEOUT: 10000, // 10秒超时
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
};

// 🔧 工具函数：设置安全头
function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  Object.entries(CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

// 🔧 工具函数：验证 Token 结构
function validateToken(token) {
  if (!token) {
    return { valid: false, reason: 'Token 不存在' };
  }

  const issues = [];
  
  if (!token.id && !token.sub) {
    issues.push('缺少用户标识');
  }
  
  if (token.exp && token.exp * 1000 < Date.now()) {
    issues.push('Token 已过期');
  }
  
  // 检查必要的字段
  if (!token.email && !token.name) {
    issues.push('缺少用户基本信息');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    reason: issues.length > 0 ? issues.join('; ') : 'Token 有效'
  };
}

// 🔧 工具函数：安全的用户 ID 解析
function parseUserId(token) {
  // 优先使用数字 ID
  if (token.id && !isNaN(token.id)) {
    return parseInt(token.id);
  }
  
  // 尝试从 sub 字段解析
  if (token.sub) {
    const idMatch = token.sub.match(/\d+/);
    if (idMatch) {
      return parseInt(idMatch[0]);
    }
  }
  
  // 使用邮箱哈希作为备用
  if (token.email) {
    let hash = 0;
    for (let i = 0; i < token.email.length; i++) {
      const char = token.email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) + 1000;
  }
  
  throw new Error('无法解析用户 ID');
}

// 🔧 工具函数：构建用户响应数据
function buildUserResponse(user, fromCache = false) {
  if (!user) return null;
  
  const baseData = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    status: user.status,
    preferences: user.preferences || {},
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
  
  // 添加计算字段
  const computedFields = {
    isPremium: user.role === 'PREMIUM',
    isAdmin: user.role === 'ADMIN',
    isActive: user.status === 'ACTIVE',
    hasImage: !!user.image,
    accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  };
  
  // 添加统计信息
  const stats = user._count ? {
    projectCount: user._count.projects || 0,
    knowledgeBaseCount: user._count.knowledgeBases || 0,
    totalAssets: (user._count.projects || 0) + (user._count.knowledgeBases || 0)
  } : {};
  
  return {
    ...baseData,
    ...computedFields,
    ...stats,
    _meta: {
      fromCache,
      cachedAt: fromCache ? new Date().toISOString() : undefined,
      version: '1.0'
    }
  };
}

// 🔧 工具函数：数据库查询用户
async function fetchUserFromDatabase(userId) {
  try {
    console.log(`🔄 从数据库查询用户: ${userId}`);
    
    const user = await prisma.user.findUnique({
      where: { 
        id: userId 
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        preferences: {
          select: {
            voiceEnabled: true,
            chatStyle: true,
            language: true,
            theme: true,
            notifications: true
          }
        },
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // 关联数据统计
        _count: {
          select: {
            projects: {
              where: { status: 'ACTIVE' }
            },
            knowledgeBases: {
              where: { status: 'ACTIVE' }
            },
            conversations: {
              where: { 
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
                }
              }
            }
          }
        }
      },
    });

    return user;
  } catch (error) {
    console.error(`❌ 数据库查询失败:`, error);
    throw error;
  }
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🔐 [${requestId}] 优化会话API被调用`, {
    method: req.method,
    url: req.url,
    hasCookies: !!req.headers.cookie
  });

  // 设置安全头
  setSecurityHeaders(res);

  // 验证 HTTP 方法
  if (!CONFIG.ALLOWED_METHODS.includes(req.method)) {
    console.warn(`❌ [${requestId}] 不支持的HTTP方法:`, req.method);
    return res.status(405).json({ 
      success: false,
      error: '方法不允许',
      code: 'METHOD_NOT_ALLOWED',
      allowed: CONFIG.ALLOWED_METHODS,
      requestId
    });
  }

  try {
    // 获取 Token（带超时）
    const tokenPromise = getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    });
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('会话获取超时')), CONFIG.SESSION_TIMEOUT)
    );

    const token = await Promise.race([tokenPromise, timeoutPromise]);
    
    // 验证 Token
    const tokenValidation = validateToken(token);
    
    console.log(`🔐 [${requestId}] Token验证结果:`, {
      hasToken: !!token,
      isValid: tokenValidation.valid,
      userId: token?.id,
      issues: tokenValidation.issues
    });

    if (!token || !tokenValidation.valid) {
      return res.status(200).json({ 
        success: true,
        user: null,
        authenticated: false,
        validation: tokenValidation,
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // 解析用户 ID
    const userId = parseUserId(token);
    const cacheKey = `${CONFIG.CACHE_PREFIX}${userId}`;
    
    // 检查缓存
    const cachedUser = sessionCache.get(cacheKey);
    if (cachedUser) {
      console.log(`⚡ [${requestId}] 从缓存获取用户会话`);
      
      const userResponse = buildUserResponse(cachedUser, true);
      
      return res.status(200).json({
        success: true,
        user: userResponse,
        authenticated: true,
        fromCache: true,
        requestId,
        timestamp: new Date().toISOString(),
        cacheStats: process.env.NODE_ENV === 'development' ? sessionCache.getStats() : undefined
      });
    }

    // 从数据库查询用户
    const user = await fetchUserFromDatabase(userId);

    if (!user) {
      console.warn(`❌ [${requestId}] 用户不存在: ${userId}`);
      return res.status(200).json({
        success: true,
        user: null,
        authenticated: false,
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // 检查用户状态
    if (user.status !== 'ACTIVE') {
      console.warn(`⛔ [${requestId}] 用户状态异常: ${user.status}`);
      return res.status(200).json({
        success: true,
        user: null,
        authenticated: false,
        error: 'ACCOUNT_SUSPENDED',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // 构建响应数据
    const userResponse = buildUserResponse(user, false);

    // 更新缓存
    sessionCache.set(cacheKey, user, CONFIG.CACHE_TTL);

    // 开发环境统计
    if (process.env.NODE_ENV === 'development') {
      const stats = sessionCache.getStats();
      console.log(`📊 [${requestId}] 会话缓存统计:`, stats);
    }

    const responseData = {
      success: true,
      user: userResponse,
      authenticated: true,
      fromCache: false,
      requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        cacheStats: sessionCache.getStats(),
        tokenInfo: {
          id: token.id,
          email: token.email,
          expires: token.exp ? new Date(token.exp * 1000).toISOString() : null
        }
      })
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] 优化会话API错误:`, error);
    
    // 根据错误类型处理
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = '内部服务器错误';

    if (error.message.includes('超时')) {
      statusCode = 408;
      errorCode = 'SESSION_TIMEOUT';
      errorMessage = '会话获取超时';
    } else if (error.code === 'P2025') {
      // Prisma 记录未找到
      statusCode = 200;
      errorCode = 'USER_NOT_FOUND';
      errorMessage = '用户不存在';
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 200;
      errorCode = 'INVALID_TOKEN';
      errorMessage = '无效的会话令牌';
    }

    const errorResponse = {
      success: statusCode === 200,
      ...(statusCode === 200 ? { user: null, authenticated: false } : { error: errorMessage }),
      code: errorCode,
      requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message
      })
    };

    return res.status(statusCode).json(errorResponse);
  }
}

// 🔧 清除用户缓存（供其他API调用）
export async function clearUserCache(userId) {
  const cacheKey = `${CONFIG.CACHE_PREFIX}${userId}`;
  sessionCache.del(cacheKey);
  console.log(`🗑️ 清除用户缓存: ${userId}`);
}

// 🔧 刷新用户缓存（供其他API调用）
export async function refreshUserCache(userId) {
  try {
    const user = await fetchUserFromDatabase(userId);
    if (user) {
      const cacheKey = `${CONFIG.CACHE_PREFIX}${userId}`;
      sessionCache.set(cacheKey, user, CONFIG.CACHE_TTL);
      console.log(`🔄 刷新用户缓存: ${userId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ 刷新用户缓存失败:`, error);
    return false;
  }
}

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};

// 导出缓存实例用于其他API调用
export { sessionCache };