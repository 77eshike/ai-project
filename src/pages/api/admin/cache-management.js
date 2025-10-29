// pages/api/admin/cache-management.js
import sessionCache from '../../../lib/session-cache';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // 只有管理员可以访问
  if (!token || token.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false,
      error: 'Forbidden',
      code: 'FORBIDDEN'
    });
  }

  if (req.method === 'GET') {
    // 获取缓存统计
    return res.status(200).json({
      success: true,
      stats: sessionCache.getStats()
    });
  } else if (req.method === 'DELETE') {
    const { userId, action } = req.body;
    
    if (action === 'clearAll') {
      const size = sessionCache.clearAll();
      return res.status(200).json({
        success: true,
        message: `Cleared all ${size} cache entries`,
        stats: sessionCache.getStats()
      });
    } else if (userId && action === 'clearUser') {
      sessionCache.invalidateUser(userId);
      return res.status(200).json({
        success: true,
        message: `Cleared cache for user ${userId}`,
        stats: sessionCache.getStats()
      });
    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid parameters',
        code: 'INVALID_PARAMETERS'
      });
    }
  }

  return res.status(405).json({ 
    success: false,
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  });
}