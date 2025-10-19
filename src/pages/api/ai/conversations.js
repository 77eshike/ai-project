// pages/api/ai/conversations.js
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { authOptions } from '../../../lib/auth'

const globalForPrisma = globalThis
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 配置常量
const MAX_CONVERSATIONS_PER_PAGE = 50
const DEFAULT_PAGE_SIZE = 20

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' })
  }

  const userId = parseInt(session.user.id)

  if (req.method === 'GET') {
    try {
      // 获取查询参数
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE
      const search = req.query.search || ''
      
      // 验证参数
      if (page < 1) {
        return res.status(400).json({ error: '页码必须大于0' })
      }
      
      if (limit < 1 || limit > MAX_CONVERSATIONS_PER_PAGE) {
        return res.status(400).json({ 
          error: `每页数量必须在1-${MAX_CONVERSATIONS_PER_PAGE}之间` 
        })
      }

      const skip = (page - 1) * limit

      // 构建查询条件
      const where = { 
        userId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { messages: { 
              path: '$[*].content', 
              string_contains: search 
            }}
          ]
        })
      }

      // 获取对话列表和总数（用于分页）
      const [conversations, totalCount] = await Promise.all([
        prisma.conversation.findMany({
          where,
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            // 计算消息数量而不是使用关系计数
            messages: {
              select: { id: true } // 只选择id用于计数，减少数据传输
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.conversation.count({ where })
      ])

      // 处理返回数据
      const conversationsWithCount = conversations.map(convo => ({
        id: convo.id,
        title: convo.title,
        createdAt: convo.createdAt,
        updatedAt: convo.updatedAt,
        messageCount: convo.messages.length
      }))

      res.status(200).json({ 
        conversations: conversationsWithCount,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      })

    } catch (error) {
      console.error('获取会话列表错误:', error)
      res.status(500).json({ error: '获取对话列表失败' })
    }
  } else if (req.method === 'DELETE') {
    // 批量删除对话
    try {
      const { conversationIds } = req.body
      
      if (!conversationIds || !Array.isArray(conversationIds)) {
        return res.status(400).json({ error: '需要提供对话ID数组' })
      }

      if (conversationIds.length === 0) {
        return res.status(400).json({ error: '对话ID数组不能为空' })
      }

      // 限制一次最多删除50个对话
      if (conversationIds.length > 50) {
        return res.status(400).json({ error: '一次最多删除50个对话' })
      }

      const result = await prisma.conversation.deleteMany({
        where: { 
          id: { in: conversationIds },
          userId 
        }
      })

      res.status(200).json({ 
        success: true, 
        deletedCount: result.count 
      })

    } catch (error) {
      console.error('批量删除会话错误:', error)
      res.status(500).json({ error: '删除对话失败' })
    }
  } else {
    res.status(405).json({ error: '方法不允许' })
  }
}