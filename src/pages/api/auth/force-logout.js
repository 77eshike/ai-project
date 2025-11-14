// pages/api/auth/force-logout.js - 优化版本
import { prisma } from '../../../../lib/prisma'

// 🔧 配置常量
const CONFIG = {
  ALLOWED_METHODS: ['POST'],
  COOKIE_CLEAR_OPTIONS: {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  },
  CACHE_HEADERS: {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// 🔧 要清理的 Cookie 列表
const COOKIES_TO_CLEAR = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Secure-next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'auth-token',
  'refresh-token',
  'user-session',
  'remember-me'
];

// 🔧 工具函数：构建 Cookie 清理字符串
function buildClearCookies() {
  return COOKIES_TO_CLEAR.map(cookieName => {
    const options = [
      `Expires=${CONFIG.COOKIE_CLEAR_OPTIONS.expires.toUTCString()}`,
      `Path=${CONFIG.COOKIE_CLEAR_OPTIONS.path}`,
      CONFIG.COOKIE_CLEAR_OPTIONS.httpOnly ? 'HttpOnly' : '',
      CONFIG.COOKIE_CLEAR_OPTIONS.secure ? 'Secure' : '',
      `SameSite=${CONFIG.COOKIE_CLEAR_OPTIONS.sameSite}`
    ].filter(Boolean).join('; ');
    
    return `${cookieName}=; ${options}`;
  });
}

// 🔧 工具函数：提取会话令牌
function extractSessionToken(cookieHeader) {
  if (!cookieHeader) return null;
  
  try {
    // 多种方式提取 session token
    const patterns = [
      /next-auth\.session-token=([^;]+)/,
      /__Secure-next-auth\.session-token=([^;]+)/,
      /auth\.token=([^;]+)/
    ];
    
    for (const pattern of patterns) {
      const match = cookieHeader.match(pattern);
      if (match && match[1]) {
        const token = match[1].trim();
        if (token && token !== 'null' && token !== 'undefined') {
          console.log('🔍 找到 session token:', token.substring(0, 20) + '...');
          return token;
        }
      }
    }
    
    console.log('🔍 未找到有效的 session token');
    return null;
  } catch (error) {
    console.warn('提取 session token 失败:', error);
    return null;
  }
}

// 🔧 工具函数：删除数据库会话
async function deleteDatabaseSession(sessionToken) {
  if (!sessionToken) {
    console.log('ℹ️ 无 session token，跳过数据库清理');
    return { deleted: 0, error: null };
  }
  
  try {
    console.log('🗑️ 尝试删除数据库会话...');
    
    // 设置超时防止长时间阻塞
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('数据库操作超时')), 5000)
    );
    
    const deletePromise = prisma.session.deleteMany({
      where: {
        sessionToken: sessionToken
      }
    });
    
    const result = await Promise.race([deletePromise, timeoutPromise]);
    const deletedCount = result.count || 0;
    
    console.log(`✅ 删除数据库会话: ${deletedCount} 个`);
    return { deleted: deletedCount, error: null };
    
  } catch (error) {
    console.warn('⚠️ 数据库会话删除失败:', error.message);
    return { deleted: 0, error: error.message };
  }
}

// 🔧 工具函数：设置安全头
function setSecurityHeaders(res) {
  // 设置缓存头
  Object.entries(CONFIG.CACHE_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // 设置安全头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Logout-Status', 'completed');
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🚨 [${requestId}] 强制退出 API 被调用`);

  try {
    // 1. 验证请求方法
    if (!CONFIG.ALLOWED_METHODS.includes(req.method)) {
      console.warn(`❌ [${requestId}] 方法不允许: ${req.method}`);
      return res.status(405).json({ 
        success: false,
        error: 'Method not allowed',
        allowedMethods: CONFIG.ALLOWED_METHODS
      });
    }

    // 2. 提取会话令牌
    const sessionToken = extractSessionToken(req.headers.cookie);
    
    // 3. 删除数据库会话
    const dbResult = await deleteDatabaseSession(sessionToken);

    // 4. 构建清理 Cookie
    const clearCookies = buildClearCookies();
    
    // 5. 设置响应头
    setSecurityHeaders(res);
    res.setHeader('Set-Cookie', clearCookies);

    // 6. 发送成功响应
    const responseData = {
      success: true,
      message: '退出登录完成',
      sessionsDeleted: dbResult.deleted,
      cookiesCleared: clearCookies.length,
      databaseError: dbResult.error,
      timestamp: new Date().toISOString(),
      requestId
    };

    console.log(`✅ [${requestId}] 强制退出完成`, {
      sessionsDeleted: dbResult.deleted,
      cookiesCleared: clearCookies.length
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] 强制退出失败:`, error);
    
    // 即使出错也尝试清理 Cookie
    try {
      const clearCookies = buildClearCookies();
      setSecurityHeaders(res);
      res.setHeader('Set-Cookie', clearCookies);
    } catch (headerError) {
      console.error(`❌ [${requestId}] 设置清理头失败:`, headerError);
    }

    // 发送错误响应
    res.status(500).json({ 
      success: false,
      error: '退出过程中发生错误',
      timestamp: new Date().toISOString(),
      requestId
    });
  }
}

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '10mb',
    // 可以添加外部解析器配置
    // externalResolver: true,
  },
};

// 🔧 健康检查函数（可选）
export async function getForceLogoutHealth() {
  try {
    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'degraded',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}