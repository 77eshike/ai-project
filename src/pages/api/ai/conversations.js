// pages/api/ai/conversations.js - 对话管理API
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: '请先登录' });
  }

  const userId = session.user.id;

  try {
    if (req.method === 'GET') {
      // 获取对话列表
      const { page = 1, limit = 20, search } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const where = {
        userId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { messages: { path: '$[*].content', string_contains: search } }
          ]
        })
      };

      const [conversations, totalCount] = await Promise.all([
        prisma.conversation.findMany({
          where,
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            metadata: true
          },
          orderBy: { updatedAt: 'desc' },
          skip: skip,
          take: parseInt(limit)
        }),
        prisma.conversation.count({ where })
      ]);

      res.status(200).json({
        success: true,
        conversations: conversations.map(conv => ({
          ...conv,
          messageCount: 0 // 由于messages是JSON，这里不计算数量
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      });

    } else if (req.method === 'DELETE') {
      // 删除对话
      const { conversationIds } = req.body;

      if (!conversationIds || !Array.isArray(conversationIds)) {
        return res.status(400).json({ error: '需要提供对话ID数组' });
      }

      const result = await prisma.conversation.deleteMany({
        where: {
          id: { in: conversationIds },
          userId
        }
      });

      res.status(200).json({
        success: true,
        deletedCount: result.count
      });

    } else {
      res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('对话管理API错误:', error);
    res.status(500).json({
      error: '操作失败',
      code: 'CONVERSATION_API_ERROR'
    });
  }
}