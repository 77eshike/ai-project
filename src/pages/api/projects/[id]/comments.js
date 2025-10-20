import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' });
  }

  const { id } = req.query;

  try {
    // 将用户 ID 转换为数字
    const userId = parseInt(session.user.id);

    // 检查项目访问权限
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId } } },
          { visibility: 'PUBLIC' }
        ]
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: '项目不存在或无权访问' 
      });
    }

    // 添加评论
    if (req.method === 'POST') {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ 
          success: false,
          error: '评论内容不能为空' 
        });
      }

      const comment = await prisma.projectComment.create({
        data: {
          projectId: id,
          userId: userId,
          content: content.trim()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      });

      return res.status(201).json({
        success: true,
        comment
      });
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });

  } catch (error) {
    console.error('项目评论API错误:', error);
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误: ' + error.message 
    });
  }
}