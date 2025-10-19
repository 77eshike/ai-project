// lib/session.js - 完整修复版本
import { getCachedServerSession, clearUserSessionCache } from './sessionWrapper';
import { authOptions, prisma } from './auth';

// 用户缓存
const userCache = new Map();
const USER_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const MAX_USER_CACHE_SIZE = 50;

export async function getCurrentUser(req, res) {
  try {
    console.log('🔐 获取当前用户 - 开始', {
      hasCookies: !!req?.headers?.cookie,
      url: req?.url
    });
    
    // 使用缓存的会话
    const session = await getCachedServerSession(req, res);
    console.log('🔐 会话信息:', session ? `用户ID: ${session.user?.id}, 邮箱: ${session.user?.email}` : '无会话')
    
    if (!session?.user?.id) {
      console.log('❌ 无有效会话或用户ID', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id
      });
      return null;
    }

    console.log('✅ 会话有效，用户ID:', session.user.id);

    // 检查用户缓存
    const cacheKey = `user-${session.user.id}`;
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser && (Date.now() - cachedUser.timestamp) < USER_CACHE_DURATION) {
      console.log('✅ 从缓存获取用户');
      return cachedUser.data;
    }

    console.log('🔍 从数据库查询用户:', session.user.id);
    // 从数据库获取完整的用户信息
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log('❌ 数据库中没有找到用户');
      return null;
    }

    // 检查用户状态
    if (user.status === 'BLOCKED') {
      console.log('❌ 用户账户已被禁用');
      return null;
    }

    console.log('✅ 用户查询成功:', user.email);

    // 更新用户缓存
    if (userCache.size >= MAX_USER_CACHE_SIZE) {
      const oldestKey = userCache.keys().next().value;
      userCache.delete(oldestKey);
    }
    
    userCache.set(cacheKey, {
      data: user,
      timestamp: Date.now()
    });

    return user;
  } catch (error) {
    console.error('❌ 获取当前用户错误:', error);
    return null;
  }
}

export async function requireAuth(req, res) {
  console.log('🔐 检查认证要求');
  const user = await getCurrentUser(req, res);
  
  if (!user) {
    console.log('❌ 认证失败: 需要登录');
    const error = new Error('需要登录才能访问');
    error.statusCode = 401;
    throw error;
  }

  console.log('✅ 认证检查通过:', user.email);
  return user;
}

export async function getSessionUser(context) {
  const { req, res } = context;
  return await getCurrentUser(req, res);
}

// 清除用户缓存
export function clearUserCache(userId = null) {
  if (userId) {
    // 清除特定用户缓存
    userCache.delete(`user-${userId}`);
    // 同时清除会话缓存
    clearUserSessionCache(userId);
    console.log('🧹 清除特定用户缓存:', userId);
  } else {
    // 清除所有用户缓存
    userCache.clear();
    console.log('🧹 清除所有用户缓存');
  }
}

// 获取缓存统计
export function getCacheStats() {
  return {
    userCache: {
      size: userCache.size,
      entries: Array.from(userCache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        userId: value.data?.id
      }))
    }
  };
}

// 定期清理过期用户缓存
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > USER_CACHE_DURATION) {
      userCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 自动清理 ${cleanedCount} 个过期用户缓存`);
  }
}, USER_CACHE_DURATION);