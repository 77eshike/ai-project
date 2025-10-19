// pages/api/session/optimized.js
import { getToken } from 'next-auth/jwt';
import prisma from '../../../lib/prisma';

// 会话缓存（简单实现，生产环境应使用Redis等）
const sessionCache = new Map();
const CACHE_DURATION = 30000; // 30秒

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return res.status(200).json({ user: null });
    }
    
    // 检查缓存
    const cacheKey = `user-${token.id}`;
    const cachedData = sessionCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      return res.status(200).json({ user: cachedData.user });
    }
    
    // 从数据库获取最新用户信息
    const user = await prisma.user.findUnique({
      where: { id: parseInt(token.id) },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      return res.status(200).json({ user: null });
    }
    
    // 更新缓存
    sessionCache.set(cacheKey, {
      user,
      timestamp: Date.now(),
    });
    
    return res.status(200).json({ user });
  } catch (error) {
    console.error('优化会话API错误:', error);
    return res.status(500).json({ message: '内部服务器错误' });
  }
}