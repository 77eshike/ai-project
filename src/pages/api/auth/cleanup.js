// pages/api/auth/cleanup.js - 优化版本
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

// 🔧 配置常量
const CONFIG = {
  ALLOWED_METHODS: ['POST'],
  CACHE_CLEANUP_TIMEOUT: 5000,
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  }
};

// 🔧 清理的 Cookie 列表
const COOKIES_TO_CLEAR = [
  {
    name: 'next-auth.session-token',
    options: 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
  },
  {
    name: '__Secure-next-auth.session-token', 
    options: 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax'
  },
  {
    name: 'next-auth.csrf-token',
    options: 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  },
  {
    name: '__Secure-next-auth.csrf-token',
    options: 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax'
  },
  {
    name: '__Host-next-auth.csrf-token',
    options: 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax'
  },
  {
    name: 'next-auth.callback-url',
    options: 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  },
  {
    name: '__Secure-next-auth.callback-url',
    options: 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax'
  }
];

// 🔧 工具函数：安全的缓存清理
async function safelyClearUserCache(userId) {
  if (!userId) return { success: false, error: '用户ID无效' };

  try {
    // 设置清理超时
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('缓存清理超时')), CONFIG.CACHE_CLEANUP_TIMEOUT)
    );

    const cleanupPromise = (async () => {
      try {
        // 动态导入缓存清理模块
        const { clearUserSessionCache } = await import('../../../lib/sessionWrapper');
        
        if (typeof clearUserSessionCache === 'function') {
          await clearUserSessionCache(userId);
          console.log('✅ 清除用户会话缓存:', userId);
          return { success: true };
        } else {
          console.warn('⚠️ 缓存清理函数不可用');
          return { success: false, error: '缓存清理功能不可用' };
        }
      } catch (error) {
        console.warn('清除会话缓存失败:', error);
        return { success: false, error: error.message };
      }
    })();

    return await Promise.race([cleanupPromise, timeoutPromise]);
  } catch (error) {
    console.error('缓存清理过程错误:', error);
    return { success: false, error: error.message };
  }
}

// 🔧 工具函数：设置安全头
function setSecurityHeaders(res) {
  Object.entries(CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

// 🔧 工具函数：清理 Cookie
function clearAuthCookies(res) {
  COOKIES_TO_CLEAR.forEach(cookie => {
    const cookieString = `${cookie.name}=; ${cookie.options}`;
    res.setHeader('Set-Cookie', cookieString);
  });

  // 额外清理可能存在的其他认证 Cookie
  const additionalCookies = [
    'auth-token',
    'refresh-token', 
    'user-session',
    'remember-me'
  ];

  additionalCookies.forEach(cookieName => {
    const cookieString = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    res.setHeader('Set-Cookie', cookieString);
  });
}

// 🔧 请求验证
function validateRequest(req) {
  if (!CONFIG.ALLOWED_METHODS.includes(req.method)) {
    throw new Error(`方法不允许: ${req.method}`);
  }

  // 可以添加更多的请求验证逻辑
  const contentType = req.headers['content-type'];
  if (contentType && !contentType.includes('application/json')) {
    throw new Error('不支持的 Content-Type');
  }
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🧹 [${requestId}] 清理会话请求开始`);

  try {
    // 设置安全头
    setSecurityHeaders(res);

    // 验证请求
    validateRequest(req);

    // 获取当前会话
    const session = await getServerSession(req, res, authOptions);
    
    console.log(`🔐 [${requestId}] 会话状态:`, {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    // 清理用户缓存（如果存在会话）
    let cacheCleanupResult = { success: false };
    if (session?.user?.id) {
      cacheCleanupResult = await safelyClearUserCache(session.user.id);
    } else {
      console.log(`ℹ️ [${requestId}] 无有效会话，跳过缓存清理`);
    }

    // 清除认证 Cookie
    clearAuthCookies(res);

    // 记录清理操作
    console.log(`✅ [${requestId}] 会话清理完成`, {
      userId: session?.user?.id,
      cacheCleaned: cacheCleanupResult.success,
      timestamp: new Date().toISOString()
    });

    // 成功响应
    res.status(200).json({ 
      success: true,
      message: '会话清理完成',
      cacheCleaned: cacheCleanupResult.success,
      cacheError: cacheCleanupResult.error,
      timestamp: new Date().toISOString(),
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 清理API错误:`, error);
    
    // 即使出错也尝试清理 Cookie
    try {
      clearAuthCookies(res);
    } catch (cookieError) {
      console.error(`❌ [${requestId}] 清理Cookie失败:`, cookieError);
    }

    // 错误响应
    const statusCode = error.message.includes('方法不允许') ? 405 : 500;
    
    res.status(statusCode).json({ 
      success: false,
      error: error.message || '内部服务器错误',
      timestamp: new Date().toISOString(),
      requestId
    });
  }
}

// 🔧 添加健康检查端点（可选）
export async function getCleanupHealth() {
  try {
    // 检查依赖模块是否可用
    const sessionWrapper = await import('../../../lib/sessionWrapper');
    const hasCacheFunction = typeof sessionWrapper.clearUserSessionCache === 'function';
    
    return {
      status: 'healthy',
      cacheCleanupAvailable: hasCacheFunction,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'degraded',
      cacheCleanupAvailable: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '10mb',
    // 禁用外部访问（如果需要）
    // externalResolver: true,
  },
};