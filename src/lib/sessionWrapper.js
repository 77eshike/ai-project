// /opt/ai-project/src/lib/sessionWrapper.js - 完全修复String ID版本
import { getServerSession } from 'next-auth/next';

// 🔧 修复：避免动态导入，使用条件导入
let authOptions;

// 预加载 authOptions（在非 Edge 环境中）
if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  try {
    // 在构建时静态导入
    const authModule = require('./auth');
    authOptions = authModule.authOptions;
  } catch (error) {
    console.warn('❌ 预加载 authOptions 失败:', error.message);
  }
}

/**
 * 增强的会话缓存类 - Edge Runtime 兼容版本
 */
class SessionCache {
  constructor() {
    this.cache = new Map();
    this.defaultDuration = 30 * 1000; // 30秒
    this.maxSize = 100;
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * 生成缓存键 - Edge Runtime 兼容
   */
  generateKey(req) {
    try {
      const cookie = req.headers.get('cookie') || '';
      
      // 优先使用会话token
      const sessionTokenMatch = cookie.match(/next-auth\.session-token=([^;]+)/);
      if (sessionTokenMatch) {
        return `session-${sessionTokenMatch[1]}`;
      }
      
      // 备用：使用csrf token
      const csrfTokenMatch = cookie.match(/next-auth\.csrf-token=([^;]+)/);
      if (csrfTokenMatch) {
        return `session-csrf-${csrfTokenMatch[1]}`;
      }
      
      // 最终备用：使用cookie哈希（Edge Runtime 兼容方式）
      let cookieHash = '';
      for (let i = 0; i < Math.min(cookie.length, 20); i++) {
        cookieHash += cookie.charCodeAt(i).toString(36);
      }
      return `session-fallback-${cookieHash}`;
    } catch (error) {
      return `session-error-${Date.now()}`;
    }
  }

  /**
   * 获取缓存会话
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    item.lastAccessed = Date.now();
    return item.data;
  }

  /**
   * 设置缓存会话
   */
  set(key, data, duration = this.defaultDuration) {
    // 如果缓存已满，清理最久未使用的
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + duration,
      lastAccessed: Date.now(),
      createdAt: Date.now()
    });

    this.stats.sets++;
  }

  /**
   * 删除缓存项
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * 清理最久未使用的缓存项
   */
  evictLRU() {
    let lruKey = null;
    let oldestAccess = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestAccess) {
        oldestAccess = item.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 🔧 修复：清除特定用户的缓存 - 修复String ID处理
   */
  clearUserSessions(userId) {
    let clearedCount = 0;
    
    // 🔧 修复：确保userId是字符串
    const targetUserId = String(userId || '');
    
    for (const [key, item] of this.cache.entries()) {
      const itemUserId = item.data?.user?.id || item.data?.id;
      
      // 🔧 修复：直接比较字符串，不进行类型转换
      if (itemUserId && String(itemUserId) === targetUserId) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.sets = 0;
    this.stats.evictions = 0;
    
    return previousSize;
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const now = Date.now();
    const activeSessions = Array.from(this.cache.values())
      .filter(item => now <= item.expiresAt)
      .length;

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2) + '%'
      : '0%';

    return {
      size: this.cache.size,
      activeSessions,
      maxSize: this.maxSize,
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      timestamp: new Date().toISOString()
    };
  }
}

// 全局缓存实例
const sessionCache = new SessionCache();

/**
 * 获取缓存的服务器会话 - Edge Runtime 兼容版本
 */
export async function getCachedServerSession(req, res) {
  // 🔧 在 Edge Runtime 中，直接返回 null 或使用简化逻辑
  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('🔧 Edge Runtime: 跳过会话缓存');
    try {
      // 在 Edge Runtime 中使用简化的会话获取
      const session = await getServerSession(req, res, await getEdgeAuthOptions());
      return session;
    } catch (error) {
      console.error('❌ Edge Runtime 会话获取失败:', error);
      return null;
    }
  }

  const startTime = Date.now();
  
  try {
    const cacheKey = sessionCache.generateKey(req);
    
    // 检查缓存
    const cachedSession = sessionCache.get(cacheKey);
    
    if (cachedSession !== null) {
      return cachedSession;
    }
    
    // 🔧 修复：使用同步方式获取 authOptions
    const session = await getServerSession(req, res, await getAuthOptions());
    
    // 缓存会话结果
    const cacheDuration = session ? 30 * 1000 : 10 * 1000;
    sessionCache.set(cacheKey, session, cacheDuration);
    
    return session;
    
  } catch (error) {
    console.error('❌ 获取缓存会话错误:', error);
    
    // 错误处理：尝试直接获取会话
    try {
      const fallbackSession = await getServerSession(req, res, await getAuthOptions());
      return fallbackSession;
    } catch (fallbackError) {
      console.error('❌ 后备会话获取失败:', fallbackError);
      return null;
    }
  }
}

/**
 * 🔧 新增：获取 authOptions 的兼容函数
 */
async function getAuthOptions() {
  if (authOptions) {
    return authOptions;
  }
  
  try {
    // 在非 Edge 环境中使用 require
    if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
      const authModule = require('./auth');
      authOptions = authModule.authOptions;
      return authOptions;
    }
    
    // 降级方案
    return getFallbackAuthOptions();
  } catch (error) {
    console.error('❌ 获取 authOptions 失败:', error);
    return getFallbackAuthOptions();
  }
}

/**
 * 🔧 新增：Edge Runtime 专用的 authOptions 获取
 */
async function getEdgeAuthOptions() {
  // Edge Runtime 中的简化配置
  return {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [],
    session: { strategy: 'jwt' },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          // 🔧 修复：确保用户ID是字符串
          token.id = String(user.id || '');
          token.email = user.email;
        }
        return token;
      },
      async session({ session, token }) {
        if (token) {
          // 🔧 修复：确保用户ID是字符串
          session.user.id = String(token.id || '');
          session.user.email = token.email;
        }
        return session;
      }
    }
  };
}

/**
 * 🔧 新增：降级 authOptions
 */
function getFallbackAuthOptions() {
  return {
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
    providers: [],
    session: { strategy: 'jwt' }
  };
}

/**
 * 🔧 修复：清除特定用户的会话缓存 - 修复String ID处理
 */
export function clearUserSessionCache(userId) {
  if (!userId) return 0;
  
  // 🔧 修复：确保userId是字符串
  const stringUserId = String(userId);
  return sessionCache.clearUserSessions(stringUserId);
}

/**
 * 清除所有会话缓存
 */
export function clearAllSessionCache() {
  return sessionCache.clearAll();
}

/**
 * 获取会话缓存统计信息
 */
export function getSessionCacheStats() {
  return sessionCache.getStats();
}

/**
 * 手动清理过期缓存
 */
export function cleanupExpiredSessions() {
  return sessionCache.cleanup();
}

export default getCachedServerSession;