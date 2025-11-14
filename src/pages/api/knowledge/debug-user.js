// /src/pages/api/knowledge/debug-user.js - 用户调试端点
import { getServerSession } from 'next-auth/next';
import auth from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    const authOptions = auth?.authOptions || auth?.options || auth;
    const session = await getServerSession(req, res, authOptions);
    
    // 获取数据库用户信息用于对比
    const prisma = require('../../../lib/prisma').default || require('../../../lib/prisma');
    const dbUsers = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      session: {
        exists: !!session,
        user: session?.user || null,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        userIdType: typeof session?.user?.id,
        sessionKeys: session ? Object.keys(session) : [],
        userKeys: session?.user ? Object.keys(session.user) : []
      },
      database: {
        users: dbUsers,
        userCount: dbUsers.length
      },
      comparison: {
        sessionUserId: session?.user?.id,
        databaseUserIds: dbUsers.map(u => u.id),
        match: dbUsers.some(u => u.id === session?.user?.id)
      }
    });
  } catch (error) {
    console.error('调试端点错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}