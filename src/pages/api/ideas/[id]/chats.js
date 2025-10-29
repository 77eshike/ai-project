import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' });
  }

  const { id } = req.query;
  const userId = parseInt(session.user.id);

  try {
    // 检查创意点权限
    const idea = await prisma.idea.findFirst({
      where: { id, userId }
    });

    if (!idea) {
      return res.status(404).json({ 
        success: false,
        error: '创意点不存在或无权访问' 
      });
    }

    if (req.method === 'GET') {
      // 获取创意点的聊天记录
      const messages = await prisma.chatMessage.findMany({
        where: { ideaId: id },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      });

      return res.status(200).json({
        success: true,
        messages
      });
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });

  } catch (error) {
    console.error('聊天记录API错误:', error);
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误: ' + error.message 
    });
  }
}