import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' });
  }

  try {
    const userId = session.user?.id;

    if (req.method === 'GET') {
      // 获取用户的创意点列表
      const ideas = await prisma.idea.findMany({
        where: { userId },
        include: {
          _count: {
            select: { chats: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return res.status(200).json({
        success: true,
        ideas
      });
    }

    if (req.method === 'POST') {
      // 创建新创意点
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ 
          success: false,
          error: '创意点标题不能为空' 
        });
      }

      const idea = await prisma.idea.create({
        data: {
          title,
          description,
          userId
        }
      });

      return res.status(201).json({
        success: true,
        idea
      });
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });

  } catch (error) {
    console.error('创意点API错误:', error);
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误: ' + error.message 
    });
  }
}