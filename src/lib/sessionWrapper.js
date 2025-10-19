// lib/sessionWrapper.js - 修复缓存问题
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

// 会话缓存 - 使用更智能的缓存策略
const sessionCache = new Map();
const SESSION_CACHE_DURATION = 30000; // 30秒
const MAX_CACHE_SIZE = 100;

// 生成缓存键
function generateCacheKey(req) {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const cookie = req.headers.cookie || '';
    
    // 使用会话token作为主要缓存键
    const sessionTokenMatch = cookie.match(/next-auth\.session-token=([^;]+)/);
    
    if (sessionTokenMatch) {
      return `session-${sessionTokenMatch[1]}`;
    }
    
    // 备用缓存键
    return `session-${Buffer.from(userAgent + cookie).toString('base64').substring(0, 50)}`;
  } catch (error) {
    return `session-fallback-${Date.now()}`;
  }
}

export async function getCachedServerSession(req, res) {
  try {
    const cacheKey = generateCacheKey(req);
    
    // 检查缓存是否有效
    const cachedSession = sessionCache.get(cacheKey);
    
    if (cachedSession && (Date.now() - cachedSession.timestamp) < SESSION_CACHE_DURATION) {
      console.log('🔐 从缓存获取会话');
      return cachedSession.data;
    }
    
    console.log('🔐 获取新会话');
    // 获取新会话
    const session = await getServerSession(req, res, authOptions);
    
    // 更新缓存
    if (session) {
      // 如果缓存太大，清理最旧的条目
      if (sessionCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = sessionCache.keys().next().value;
        sessionCache.delete(oldestKey);
      }
      
      sessionCache.set(cacheKey, {
        data: session,
        timestamp: Date.now()
      });
    } else {
      // 如果没有会话，也缓存空结果（避免频繁查询）
      sessionCache.set(cacheKey, {
        data: null,
        timestamp: Date.now()
      });
    }
    
    return session;
  } catch (error) {
    console.error('❌ 获取缓存会话错误:', error);
    // 出错时直接获取会话，不使用缓存
    return await getServerSession(req, res, authOptions);
  }
}

// 清除特定用户的缓存
export function clearUserSessionCache(userId) {
  for (const [key, value] of sessionCache.entries()) {
    if (value.data?.user?.id === userId) {
      sessionCache.delete(key);
      console.log('🧹 清除用户会话缓存:', userId);
    }
  }
}

// 清除所有会话缓存
export function clearAllSessionCache() {
  sessionCache.clear();
  console.log('🧹 清除所有会话缓存');
}

// 定期清理过期缓存
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of sessionCache.entries()) {
    if (now - value.timestamp > SESSION_CACHE_DURATION) {
      sessionCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 自动清理 ${cleanedCount} 个过期会话缓存`);
  }
}, SESSION_CACHE_DURATION);