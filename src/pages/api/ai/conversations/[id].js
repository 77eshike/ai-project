// pages/api/ai/conversations/[id].js
import { getServerSession } from 'next-auth/next'

import { authOptions } from '../../../../lib/auth'

const globalForPrisma = globalThis
const prisma = globalForPrisma.prisma || prisma
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' })
  }

  const userId = parseInt(session.user.id)
  const conversationId = req.query.id

  // 验证对话ID格式
  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: '无效的对话ID' })
  }

  try {
    if (req.method === 'GET') {
      const conversation = await prisma.conversation.findFirst({
        where: { 
          id: conversationId,
          userId 
        },
        select: {
          id: true,
          title: true,
          messages: true,
          createdAt: true,
          updatedAt: true
        }
      })

      if (!conversation) {
        return res.status(404).json({ error: '对话不存在' })
      }

      res.status(200).json({ conversation })

    } else if (req.method === 'DELETE') {
      // 使用deleteMany确保用户只能删除自己的对话
      const result = await prisma.conversation.deleteMany({
        where: { 
          id: conversationId,
          userId 
        }
      })

      if (result.count === 0) {
        return res.status(404).json({ error: '对话不存在或无权访问' })
      }

      res.status(200).json({ 
        success: true,
        message: '对话删除成功'
      })

    } else if (req.method === 'PATCH') {
      // 更新对话标题
      const { title } = req.body

      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: '标题不能为空' })
      }

      if (title.length > 100) {
        return res.status(400).json({ error: '标题过长（最大100字符）' })
      }

      const updatedConversation = await prisma.conversation.updateMany({
        where: { 
          id: conversationId,
          userId 
        },
        data: { 
          title: title.trim(),
          updatedAt: new Date()
        }
      })

      if (updatedConversation.count === 0) {
        return res.status(404).json({ error: '对话不存在或无权访问' })
      }

      res.status(200).json({ 
        success: true,
        message: '标题更新成功'
      })

    } else {
      res.status(405).json({ error: '方法不允许' })
    }

  } catch (error) {
    console.error('对话操作错误:', error)
    
    // 更具体的错误处理
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '对话不存在' })
    }

    res.status(500).json({ 
      error: '操作失败',
      code: 'INTERNAL_ERROR'
    })
  }
}