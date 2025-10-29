import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { content, ideaId, messageType } = req.body;
    const userId = parseInt(session.user.id);

    if (!content) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 保存用户消息
    const userMessage = await prisma.chatMessage.create({
      data: {
        content,
        role: 'USER',
        messageType: messageType || 'TEXT',
        userId,
        ideaId: ideaId || null
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    // 调用 AI 服务生成回复
    const aiResponse = await generateAIResponse(content, ideaId, userId);

    // 保存 AI 回复
    const aiMessage = await prisma.chatMessage.create({
      data: {
        content: aiResponse.content,
        role: 'ASSISTANT',
        messageType: 'TEXT',
        voiceUrl: aiResponse.voiceUrl, // 如果有语音回复
        userId,
        ideaId: ideaId || null
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    return res.status(200).json({
      success: true,
      userMessage,
      aiResponse: aiMessage
    });

  } catch (error) {
    console.error('发送消息API错误:', error);
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误: ' + error.message 
    });
  }
}

async function generateAIResponse(userMessage, ideaId, userId) {
  // 这里调用你的 AI 服务
  // 可以使用 DeepSeek API 或其他 AI 服务
  
  // 模拟 AI 回复
  return {
    content: `我理解你的想法："${userMessage}"。这是一个很有创意的点子！让我们深入探讨一下。`,
    voiceUrl: null // 可以在这里添加语音生成逻辑
  };
}