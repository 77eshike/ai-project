// /opt/ai-project/src/lib/session.js - 简化版本
import { getCachedServerSession } from './sessionWrapper';

// 用户缓存
const userCache = new Map();
const USER_CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// 动态导入 Prisma
let prisma;
async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function getCurrentUser(req, res) {
  try {
    const session = await getCachedServerSession(req, res);
    
    if (!session?.user?.id) {
      return null;
    }

    // 检查用户缓存
    const cacheKey = `user-${session.user.id}`;
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser && (Date.now() - cachedUser.timestamp) < USER_CACHE_DURATION) {
      return cachedUser.data;
    }

    // 从数据库查询
    const prismaClient = await getPrisma();
    const user = await prismaClient.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
      }
    });

    if (!user || user.status === 'BLOCKED') {
      return null;
    }

    // 更新缓存
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
  const user = await getCurrentUser(req, res);
  
  if (!user) {
    const error = new Error('需要登录才能访问');
    error.statusCode = 401;
    throw error;
  }

  return user;
}