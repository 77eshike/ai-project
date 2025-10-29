// /opt/ai-project/src/lib/session.js - 修复字段名版本
import { getCachedServerSession } from './sessionWrapper';

// 增强的用户缓存类 - 修复内存泄漏和性能问题
class EnhancedUserCache {
  constructor() {
    this.cache = new Map();
    this.accessStats = new Map(); // 访问统计
    this.defaultDuration = 5 * 60 * 1000; // 5分钟
    this.maxSize = 1000; // 防止内存泄漏
    this.cleanupInterval = 5 * 60 * 1000; // 5分钟清理一次
    
    this.startCleanup();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.recordAccess(key, false);
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.recordAccess(key, false);
      return null;
    }

    // 更新访问时间和统计
    item.lastAccessed = Date.now();
    item.accessCount = (item.accessCount || 0) + 1;
    this.recordAccess(key, true);
    
    return item.data;
  }

  set(key, data, duration = this.defaultDuration) {
    // 检查缓存大小，防止内存泄漏
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + duration,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      accessCount: 0
    });
    
    this.recordAccess(key, 'set');
  }

  delete(key) {
    this.accessStats.delete(key);
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.accessStats.clear();
  }

  // 记录访问统计
  recordAccess(key, hit) {
    const stats = this.accessStats.get(key) || { hits: 0, misses: 0, lastAccess: Date.now() };
    
    if (hit === true) stats.hits++;
    else if (hit === false) stats.misses++;
    
    stats.lastAccess = Date.now();
    this.accessStats.set(key, stats);
  }

  // LRU淘汰算法
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessStats.delete(lruKey);
      console.log(`🗑️ LRU淘汰缓存: ${lruKey}`);
    }
  }

  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      totalSize += this.estimateSize(item.data);
      
      if (now > item.expiresAt) {
        this.cache.delete(key);
        this.accessStats.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {
      console.log(`🧹 清理了 ${cleanedCount} 个过期缓存，当前大小: ${this.cache.size}, 估算内存: ${(totalSize / 1024).toFixed(2)}KB`);
    }
  }

  // 估算对象大小
  estimateSize(obj) {
    return new Blob([JSON.stringify(obj)]).size;
  }

  getStats() {
    let totalHits = 0;
    let totalMisses = 0;
    
    for (const stats of this.accessStats.values()) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
    }
    
    const totalAccess = totalHits + totalMisses;
    const hitRate = totalAccess > 0 ? ((totalHits / totalAccess) * 100).toFixed(2) + '%' : '0%';
    
    return {
      size: this.cache.size,
      hitRate,
      totalHits,
      totalMisses,
      totalAccess,
      maxSize: this.maxSize
    };
  }
}

// 全局缓存实例
const userCache = new EnhancedUserCache();

// Prisma 客户端管理 - 修复连接问题
class PrismaManager {
  constructor() {
    this.prisma = null;
    this.connectionPromise = null;
    this.isConnecting = false;
  }

  async getClient() {
    if (this.prisma) {
      return this.prisma;
    }

    if (this.isConnecting) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.initializePrisma();
    
    try {
      this.prisma = await this.connectionPromise;
      return this.prisma;
    } finally {
      this.isConnecting = false;
    }
  }

  async initializePrisma() {
    try {
      // 使用 getPrisma 而不是直接导入 PrismaClient
      const { getPrisma } = await import('./prisma');
      const prisma = await getPrisma();

      // 测试连接但不阻塞
      prisma.$connect().then(() => {
        console.log('✅ Prisma 连接就绪');
      }).catch(error => {
        console.error('❌ Prisma 连接失败:', error.message);
      });

      return prisma;
    } catch (error) {
      console.error('❌ Prisma 初始化失败:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      this.connectionPromise = null;
    }
  }
}

const prismaManager = new PrismaManager();

/**
 * 获取当前用户信息 - 修复字段名错误
 */
export async function getCurrentUser(req, res) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [${requestId}] 开始获取用户会话`);
    }

    // 获取会话
    const session = await getCachedServerSession(req, res);
    
    if (!session?.user?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 [${requestId}] 无有效会话`);
      }
      return null;
    }

    const userId = session.user.id;
    
    // 验证用户ID格式
    if (!isValidUserId(userId)) {
      console.warn(`❌ [${requestId}] 无效的用户ID格式:`, userId);
      return null;
    }

    // 检查缓存
    const cacheKey = `user-${userId}`;
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser) {
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ [${requestId}] 缓存命中: ${userId} (${duration}ms)`);
      }
      return cachedUser;
    }

    // 数据库查询
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [${requestId}] 查询数据库: ${userId}`);
    }

    const prismaClient = await prismaManager.getClient();
    const user = await prismaClient.user.findUnique({
      where: { 
        id: parseInt(userId) 
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        lastLoginAt: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        // 修复字段名：knowledgeItems -> knowledges
        _count: {
          select: {
            projects: true,
            conversations: true,
            knowledges: true  // 修复这里
          }
        }
      }
    });

    // 用户不存在或状态异常
    if (!user) {
      console.warn(`❌ [${requestId}] 用户不存在: ${userId}`);
      return null;
    }

    if (user.status !== 'ACTIVE') {
      console.warn(`⛔ [${requestId}] 用户状态异常: ${userId} - ${user.status}`);
      userCache.delete(cacheKey);
      return null;
    }

    // 准备用户数据
    const userData = {
      ...user,
      // 添加计算字段
      isAuthenticated: true,
      isAdmin: user.role === 'ADMIN',
      isPremium: ['PREMIUM', 'ADMIN'].includes(user.role),
      // 添加统计信息
      stats: user._count,
      // 格式化日期
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    // 删除不需要的字段
    delete userData._count;

    // 根据用户活跃度设置缓存时间
    const cacheDuration = calculateCacheDuration(user);
    userCache.set(cacheKey, userData, cacheDuration);

    const totalDuration = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${requestId}] 用户数据获取完成: ${userId} (${totalDuration}ms)`);
    }

    return userData;

  } catch (error) {
    console.error(`❌ [${requestId}] 获取用户错误:`, error);
    
    // 分类错误处理
    if (error.code === 'P2025') {
      // Prisma 记录未找到
      return null;
    }
    
    if (error.code === 'P1017' || error.code === 'P1001') {
      // Prisma 连接问题
      console.error(`🔌 [${requestId}] 数据库连接异常，重置连接`);
      await prismaManager.disconnect();
    }
    
    // 网络超时等临时错误，返回null但不抛出
    if (isTemporaryError(error)) {
      return null;
    }
    
    // 其他严重错误
    throw error;
  }
}

/**
 * 要求用户认证的中间件 - 增强版本
 */
export async function requireAuth(req, res) {
  const user = await getCurrentUser(req, res);
  
  if (!user) {
    const error = new Error('需要登录才能访问此资源');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    error.redirectTo = '/auth/signin';
    throw error;
  }

  return user;
}

/**
 * 要求管理员权限的中间件
 */
export async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  
  if (!user.isAdmin) {
    const error = new Error('需要管理员权限才能访问此资源');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  return user;
}

/**
 * 可选认证中间件 - 不强制要求登录
 */
export async function optionalAuth(req, res) {
  try {
    return await getCurrentUser(req, res);
  } catch (error) {
    // 对于可选认证，忽略错误返回null
    return null;
  }
}

/**
 * 清除用户缓存
 */
export function clearUserCache(userId) {
  const cacheKey = `user-${userId}`;
  const deleted = userCache.delete(cacheKey);
  
  if (deleted && process.env.NODE_ENV === 'development') {
    console.log(`🗑️ 清除用户缓存: ${userId}`);
  }
  
  return deleted;
}

/**
 * 批量清除用户缓存
 */
export function clearMultipleUserCache(userIds) {
  let clearedCount = 0;
  
  for (const userId of userIds) {
    if (clearUserCache(userId)) {
      clearedCount++;
    }
  }
  
  return clearedCount;
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return userCache.getStats();
}

/**
 * 重置缓存（用于测试或维护）
 */
export function resetCache() {
  const stats = userCache.getStats();
  userCache.clear();
  console.log(`🔄 缓存已重置，之前大小: ${stats.size}`);
  return stats;
}

// 工具函数
function isValidUserId(userId) {
  if (!userId) return false;
  
  // 检查是否为数字字符串
  if (!/^\d+$/.test(userId)) return false;
  
  // 转换为数字检查范围
  const idNum = parseInt(userId);
  return idNum > 0 && idNum < 2147483647;
}

function calculateCacheDuration(user) {
  // 根据用户角色和活跃度设置缓存时间
  const baseDuration = 5 * 60 * 1000; // 5分钟
  
  if (user.role === 'ADMIN') {
    return 2 * 60 * 1000; // 管理员2分钟
  }
  
  if (user.role === 'PREMIUM') {
    return 10 * 60 * 1000; // 高级用户10分钟
  }
  
  // 根据最后登录时间调整
  const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
  if (lastLogin && (Date.now() - lastLogin.getTime()) < 24 * 60 * 60 * 1000) {
    return 10 * 60 * 1000; // 24小时内登录过的用户10分钟
  }
  
  return baseDuration;
}

function isTemporaryError(error) {
  const temporaryErrors = [
    'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 
    'P1001', 'P1017' // Prisma 连接错误
  ];
  
  return temporaryErrors.includes(error.code) || 
         error.message?.includes('timeout') ||
         error.message?.includes('network');
}

// 优雅关闭
process.on('beforeExit', async () => {
  console.log('🔌 关闭 Prisma 连接...');
  await prismaManager.disconnect();
  userCache.stopCleanup();
});

// 导出缓存实例用于高级管理
export { userCache, prismaManager };