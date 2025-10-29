// /opt/ai-project/src/lib/sessionWrapper.js - 优化版本
import { getServerSession } from 'next-auth/next';

// 🔧 关键修复：直接从 lib 导入 authOptions，避免动态导入问题
import { authOptions } from './auth';

/**
 * 增强的会话缓存类
 */
class SessionCache {
  constructor() {
    this.cache = new Map();
    this.defaultDuration = 30 * 1000; // 30秒
    this.maxSize = 100;
    this.cleanupInterval = 60 * 1000; // 1分钟清理一次
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
    
    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 生成缓存键
   */
  generateKey(req) {
    try {
      const cookie = req.headers.cookie || '';
      
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
      
      // 最终备用：使用cookie哈希
      const cookieHash = Buffer.from(cookie).toString('base64').substring(0, 20);
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ 清理LRU会话缓存:', lruKey.substring(0, 20));
      }
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

    if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {
      console.log(`🧹 自动清理 ${cleanedCount} 个过期会话缓存`);
    }

    return cleanedCount;
  }

  /**
   * 启动定期清理
   */
  startCleanup() {
    if (typeof setInterval !== 'undefined' && process.env.NODE_ENV !== 'test') {
      setInterval(() => {
        this.cleanup();
      }, this.cleanupInterval);
    }
  }

  /**
   * 清除特定用户的缓存
   */
  clearUserSessions(userId) {
    let clearedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.data?.user?.id === userId) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0 && process.env.NODE_ENV === 'development') {
      console.log(`🧹 清除用户 ${userId} 的 ${clearedCount} 个会话缓存`);
    }
    
    return clearedCount;
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    const previousSize = this.cache.size;
    this.cache.clear();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 清除所有会话缓存: ${previousSize} 个条目`);
    }
    
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
      memoryUsage: `${(process.memoryUsage?.().heapUsed / 1024 / 1024).toFixed(2)}MB` || 'N/A'
    };
  }
}

// 全局缓存实例
const sessionCache = new SessionCache();

/**
 * 获取缓存的服务器会话
 */
export async function getCachedServerSession(req, res) {
  const startTime = Date.now();
  
  try {
    const cacheKey = sessionCache.generateKey(req);
    
    // 检查缓存
    const cachedSession = sessionCache.get(cacheKey);
    
    if (cachedSession !== null) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ 会话缓存命中: ${Date.now() - startTime}ms`);
      }
      return cachedSession;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 获取新会话...');
    }
    
    // 🔧 修复：直接使用导入的 authOptions
    const session = await getServerSession(req, res, authOptions);
    
    // 缓存会话结果（包括null）
    const cacheDuration = session ? 30 * 1000 : 10 * 1000; // 有会话缓存30秒，无会话缓存10秒
    sessionCache.set(cacheKey, session, cacheDuration);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ 会话获取完成: ${Date.now() - startTime}ms`, {
        hasSession: !!session,
        userId: session?.user?.id
      });
    }
    
    return session;
    
  } catch (error) {
    console.error('❌ 获取缓存会话错误:', error);
    
    // 错误处理：尝试直接获取会话（绕过缓存）
    try {
      console.log('🔄 尝试直接获取会话（绕过缓存）...');
      const fallbackSession = await getServerSession(req, res, authOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 后备会话获取成功');
      }
      
      return fallbackSession;
    } catch (fallbackError) {
      console.error('❌ 后备会话获取也失败:', fallbackError);
      return null;
    }
  }
}

/**
 * 清除特定用户的会话缓存
 */
export function clearUserSessionCache(userId) {
  return sessionCache.clearUserSessions(userId);
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

// 开发环境：定期输出统计信息
if (process.env.NODE_ENV === 'development' && typeof setInterval !== 'undefined') {
  setInterval(() => {
    const stats = sessionCache.getStats();
    if (stats.activeSessions > 0) {
      console.log('📊 会话缓存统计:', stats);
    }
  }, 5 * 60 * 1000); // 每5分钟输出一次
}

export default getCachedServerSession;