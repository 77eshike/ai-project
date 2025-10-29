// pages/api/session/optimized.js
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  // 设置缓存头
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    });
    
    if (!token) {
      return res.status(200).json({ 
        success: true,
        user: null,
        authenticated: false
      });
    }

    // 验证 token 结构
    if (!token.id || !token.sub) {
      console.warn('❌ 无效的 token 结构:', token);
      return res.status(200).json({
        success: true,
        user: null,
        authenticated: false
      });
    }

    const cacheKey = `user-${token.id}`;
    
    // 检查缓存
    const cachedUser = sessionCache.get(cacheKey);
    if (cachedUser) {
      console.log('⚡ 从缓存获取用户会话');
      return res.status(200).json({
        success: true,
        user: cachedUser,
        authenticated: true,
        fromCache: true
      });
    }

    // 数据库查询
    console.log('🔄 从数据库查询用户会话');
    const user = await prisma.user.findUnique({
      where: { 
        id: parseInt(token.id) 
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        preferences: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // 关联数据（根据需要添加）
        _count: {
          select: {
            projects: true,
            knowledgeBases: true
          }
        }
      },
    });

    if (!user) {
      console.warn(`❌ 用户不存在: ${token.id}`);
      return res.status(200).json({
        success: true,
        user: null,
        authenticated: false
      });
    }

    // 检查用户状态
    if (user.status !== 'ACTIVE') {
      console.warn(`⛔ 用户状态异常: ${user.status}`);
      return res.status(200).json({
        success: true,
        user: null,
        authenticated: false,
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // 准备响应数据
    const userData = {
      ...user,
      // 添加计算字段
      isPremium: user.role === 'PREMIUM',
      isAdmin: user.role === 'ADMIN',
      // 格式化日期
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    // 更新缓存
    sessionCache.set(cacheKey, userData);

    // 记录统计信息（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 会话缓存统计:', sessionCache.getStats());
    }

    return res.status(200).json({
      success: true,
      user: userData,
      authenticated: true,
      fromCache: false,
      cacheStats: process.env.NODE_ENV === 'development' ? sessionCache.getStats() : undefined
    });

  } catch (error) {
    console.error('❌ 优化会话API错误:', error);
    
    // 根据错误类型返回不同的状态码
    if (error.code === 'P2025') {
      // Prisma 记录未找到
      return res.status(200).json({
        success: true,
        user: null,
        authenticated: false
      });
    }

    return res.status(500).json({
      success: false,
      error: '内部服务器错误',
      code: 'INTERNAL_SERVER_ERROR',
      // 开发环境返回详细错误
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message
      })
    });
  }
}

// 导出缓存实例用于其他API调用
