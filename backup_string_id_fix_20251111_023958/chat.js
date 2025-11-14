// src/pages/api/ai/chat.js - 修复版本（适配 String ID）
import { getServerSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  console.log('🔐 AI聊天API - 修复版本');
  
  try {
    // 🔧 简化的认证检查
    const session = await getServerSession(req, res);
    
    console.log('🔍 会话检查结果:', {
      有会话: !!session,
      用户ID: session?.user?.id,
      用户ID类型: typeof session?.user?.id,
      邮箱: session?.user?.email
    });

    if (!session?.user?.id) {
      console.log('❌ 会话验证失败: 无有效用户ID');
      return res.status(401).json({ 
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED',
        sessionExpired: true
      });
    }

    // ✅ 修复：移除 parseInt，直接使用字符串 ID
    const userId = session.user.id;
    
    // ✅ 修复：更新 ID 验证逻辑
    if (!isValidUserId(userId)) {
      console.log('❌ 无效的用户ID格式:', userId);
      return res.status(401).json({ 
        success: false,
        error: '用户信息无效',
        code: 'INVALID_USER_DATA'
      });
    }

    console.log('✅ 认证成功:', { 
      userId: userId, 
      email: session.user.email 
    });

    // 🔧 简化的请求验证
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false,
        error: '方法不允许'
      });
    }

    const { message, conversationId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: '消息内容不能为空'
      });
    }

    // 🔧 验证用户是否存在且状态正常
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true }
      });

      if (!user) {
        console.log('❌ 数据库中没有找到用户:', userId);
        return res.status(401).json({ 
          success: false,
          error: '用户不存在',
          code: 'USER_NOT_FOUND'
        });
      }

      if (user.status !== 'ACTIVE') {
        console.log('❌ 用户状态异常:', userId, user.status);
        return res.status(401).json({ 
          success: false,
          error: '账户状态异常',
          code: 'USER_INACTIVE'
        });
      }
    } catch (dbError) {
      console.error('❌ 数据库查询错误:', dbError);
      return res.status(500).json({ 
        success: false,
        error: '用户验证失败',
        code: 'DATABASE_ERROR'
      });
    }

    // 🔧 模拟AI响应（实际项目中替换为真实的AI调用）
    const aiResponse = await simulateAIResponse(message.trim(), userId);
    
    res.status(200).json({
      success: true,
      response: aiResponse,
      conversationId: conversationId || `conv-${Date.now()}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI聊天API异常:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// ✅ 修复：ID 验证函数
function isValidUserId(userId) {
  if (!userId) return false;
  
  // 支持字符串 ID (cuid)
  if (typeof userId === 'string') {
    // cuid 格式检查
    if (userId.length >= 10 && userId.length <= 30) {
      return /^[a-zA-Z0-9_-]+$/.test(userId);
    }
    // 也支持数字字符串（遗留数据）
    return /^\d+$/.test(userId);
  }
  
  // 支持数字 ID（遗留数据）
  if (typeof userId === 'number') {
    return userId > 0 && userId < 2147483647;
  }
  
  return false;
}

// 🔧 模拟AI响应函数
async function simulateAIResponse(message, userId) {
  // 模拟处理延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return `这是对"${message}"的模拟响应。用户ID: ${userId} (类型: ${typeof userId})`;
}