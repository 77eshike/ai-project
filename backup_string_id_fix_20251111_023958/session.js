// /opt/ai-project/src/lib/session.js - 修复版本（适配 String ID）
import { getCachedServerSession } from './sessionWrapper';

// 增强的用户缓存类
class EnhancedUserCache {
  constructor() {
    this.cache = new Map();
    this.accessStats = new Map();
    this.defaultDuration = 5 * 60 * 1000;
    this.maxSize = 1000;
    this.cleanupInterval = 5 * 60 * 1000;
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

    item.lastAccessed = Date.now();
    item.accessCount = (item.accessCount || 0) + 1;
    this.recordAccess(key, true);
    return item.data;
  }

  set(key, data, duration = this.defaultDuration) {
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

  recordAccess(key, hit) {
    const stats = this.accessStats.get(key) || { hits: 0, misses: 0, lastAccess: Date.now() };
    if (hit === true) stats.hits++;
    else if (hit === false) stats.misses++;
    stats.lastAccess = Date.now();
    this.accessStats.set(key, stats);
  }

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
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        this.accessStats.delete(key);
        cleanedCount++;
      }
    }
  }

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

const userCache = new EnhancedUserCache();

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
      const { getPrisma } = await import('./prisma');
      const prisma = await getPrisma();
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

// ✅ 修复：统一状态检查函数（适配枚举值）
function isUserActive(status) {
  return status === 'ACTIVE';
}

export async function getCurrentUser(req, res) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [${requestId}] 开始获取用户会话`);
    }

    const session = await getCachedServerSession(req, res);
    
    if (!session?.user?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 [${requestId}] 无有效会话`);
      }
      return null;
    }

    const userId = session.user.id;
    
    // ✅ 修复：更新 ID 验证逻辑，支持 cuid 格式
    if (!isValidUserId(userId)) {
      console.warn(`❌ [${requestId}] 无效的用户ID格式:`, userId);
      return null;
    }

    const cacheKey = `user-${userId}`;
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser) {
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ [${requestId}] 缓存命中: ${userId} (${duration}ms)`);
      }
      return cachedUser;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [${requestId}] 查询数据库: ${userId}`);
    }

    const prismaClient = await prismaManager.getClient();
    
    let user;
    try {
      // ✅ 修复：移除 parseInt，直接使用 String ID
      user = await prismaClient.user.findUnique({
        where: { 
          id: userId  // 直接使用字符串 ID
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
          _count: {
            select: {
              projects: true,
              conversations: true,
              ...(await getKnowledgeFieldName(prismaClient))
            }
          }
        }
      });
    } catch (dbError) {
      console.error(`❌ [${requestId}] 数据库查询错误:`, dbError);
      if (dbError.message?.includes('knowledge') || dbError.message?.includes('Field')) {
        console.log(`🔄 [${requestId}] 尝试简化查询（跳过 _count）`);
        user = await prismaClient.user.findUnique({
          where: { 
            id: userId  // 直接使用字符串 ID
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
            updatedAt: true
          }
        });
      } else {
        throw dbError;
      }
    }

    if (!user) {
      console.warn(`❌ [${requestId}] 用户不存在: ${userId}`);
      return null;
    }

    // ✅ 修复：使用统一的状态检查函数（适配枚举值）
    if (!isUserActive(user.status)) {
      console.warn(`⛔ [${requestId}] 用户状态异常: ${userId} - ${user.status} (类型: ${typeof user.status})`);
      userCache.delete(cacheKey);
      return null;
    }

    const userData = {
      ...user,
      isAuthenticated: true,
      isAdmin: user.role === 'ADMIN',
      isPremium: ['PREMIUM', 'ADMIN'].includes(user.role),
      stats: user._count || {},
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    delete userData._count;

    const cacheDuration = calculateCacheDuration(user);
    userCache.set(cacheKey, userData, cacheDuration);

    const totalDuration = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${requestId}] 用户数据获取完成: ${userId} (${totalDuration}ms)`);
    }

    return userData;

  } catch (error) {
    console.error(`❌ [${requestId}] 获取用户错误:`, error);
    if (error.code === 'P2025') {
      return null;
    }
    if (error.code === 'P1017' || error.code === 'P1001') {
      console.error(`🔌 [${requestId}] 数据库连接异常，重置连接`);
      await prismaManager.disconnect();
    }
    if (isTemporaryError(error)) {
      return null;
    }
    throw error;
  }
}

async function getKnowledgeFieldName(prismaClient) {
  const possibleFieldNames = ['knowledges', 'knowledgeItems', 'knowledge', 'knowledgeBases'];
  for (const fieldName of possibleFieldNames) {
    try {
      await prismaClient.user.findFirst({
        select: {
          _count: {
            select: {
              [fieldName]: true
            }
          }
        }
      });
      console.log(`✅ 发现知识库字段名: ${fieldName}`);
      return { [fieldName]: true };
    } catch (error) {
      continue;
    }
  }
  console.log('⚠️ 未找到知识库字段名，跳过统计');
  return {};
}

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

export async function optionalAuth(req, res) {
  try {
    return await getCurrentUser(req, res);
  } catch (error) {
    return null;
  }
}

export function clearUserCache(userId) {
  const cacheKey = `user-${userId}`;
  const deleted = userCache.delete(cacheKey);
  if (deleted && process.env.NODE_ENV === 'development') {
    console.log(`🗑️ 清除用户缓存: ${userId}`);
  }
  return deleted;
}

export function clearMultipleUserCache(userIds) {
  let clearedCount = 0;
  for (const userId of userIds) {
    if (clearUserCache(userId)) {
      clearedCount++;
    }
  }
  return clearedCount;
}

export function getCacheStats() {
  return userCache.getStats();
}

export function resetCache() {
  const stats = userCache.getStats();
  userCache.clear();
  console.log(`🔄 缓存已重置，之前大小: ${stats.size}`);
  return stats;
}

// ✅ 修复：更新 ID 验证逻辑，支持 cuid 格式
function isValidUserId(userId) {
  if (!userId) return false;
  // cuid 格式：字符串，长度通常为 25
  if (typeof userId !== 'string') return false;
  if (userId.length < 10 || userId.length > 30) return false;
  // 简单的格式检查
  return /^[a-zA-Z0-9_-]+$/.test(userId);
}

function calculateCacheDuration(user) {
  const baseDuration = 5 * 60 * 1000;
  if (user.role === 'ADMIN') {
    return 2 * 60 * 1000;
  }
  if (user.role === 'PREMIUM') {
    return 10 * 60 * 1000;
  }
  const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
  if (lastLogin && (Date.now() - lastLogin.getTime()) < 24 * 60 * 60 * 1000) {
    return 10 * 60 * 1000;
  }
  return baseDuration;
}

function isTemporaryError(error) {
  const temporaryErrors = [
    'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 
    'P1001', 'P1017'
  ];
  return temporaryErrors.includes(error.code) || 
         error.message?.includes('timeout') ||
         error.message?.includes('network');
}

process.on('beforeExit', async () => {
  console.log('🔌 关闭 Prisma 连接...');
  await prismaManager.disconnect();
  userCache.stopCleanup();
});

export { userCache, prismaManager };