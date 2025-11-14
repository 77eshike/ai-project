// /opt/ai-project/src/pages/api/ai/chat.js - 添加会话诊断
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import OpenAI from 'openai';

console.log('🔄 chat.js 模块加载 - 会话诊断版本');

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
  timeout: 30000,
});

export default async function handler(req, res) {
  console.log('🚀 chat.js API被调用 - 会话诊断版本');
  console.log('📝 请求头:', {
    cookie: req.headers.cookie ? '有Cookie' : '无Cookie',
    'user-agent': req.headers['user-agent'],
    host: req.headers.host
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    console.log('🔐 开始会话验证...');
    const session = await getServerSession(req, res, authOptions);
    
    console.log('👤 会话验证结果:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    });

    if (!session?.user?.id) {
      console.log('❌ 无有效会话，返回401错误');
      console.log('🔍 请求Cookie:', req.headers.cookie);
      
      return res.status(401).json({
        error: '未经授权的访问',
        code: 'UNAUTHORIZED',
        message: '请先登录',
        redirectTo: '/auth/signin',
        hasCookies: !!req.headers.cookie
      });
    }

    const userId = session.user.id;
    console.log('✅ 用户认证通过:', { userId, email: session.user.email });

    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('📨 请求体内容:', {
        message: body.message ? body.message.substring(0, 50) + (body.message.length > 50 ? '...' : '') : '无',
        conversationId: body.conversationId || '新对话'
      });
    } catch (error) {
      console.error('❌ 请求体解析失败:', error);
      return res.status(400).json({ error: '无效的请求格式' });
    }

    const { message, conversationId } = body;

    if (!message?.trim()) {
      console.log('❌ 消息内容为空');
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    console.log('🎯 开始真实AI调用流程...');

    try {
      // 调用DeepSeek API
      const completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: message.trim() }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('AI返回空响应');
      }

      console.log('✅ 真实AI响应成功');

      // 保存到数据库
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const newConversation = await prisma.conversation.create({
          data: {
            userId: userId,
            title: aiResponse.substring(0, 50) + (aiResponse.length > 50 ? '...' : ''),
            messages: [
              { role: 'user', content: message.trim(), timestamp: new Date().toISOString() },
              { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
            ]
          }
        });
        currentConversationId = newConversation.id;
      }

      console.log('🎉 所有操作完成，返回真实AI响应');

      // 返回成功响应
      res.status(200).json({
        success: true,
        response: aiResponse,
        conversationId: currentConversationId,
        timestamp: new Date().toISOString(),
        isRealAI: true,
        model: completion.model,
        usage: completion.usage,
        sessionInfo: {
          userId: userId,
          authenticated: true
        }
      });

    } catch (apiError) {
      console.error('❌ DeepSeek API调用失败:', apiError);
      
      res.status(500).json({
        error: `AI服务调用失败: ${apiError.message}`,
        code: apiError.code,
        timestamp: new Date().toISOString(),
        isRealAI: false
      });
    }

  } catch (error) {
    console.error('❌ 聊天API整体错误:', error);
    
    res.status(500).json({
      error: `服务异常: ${error.message}`,
      timestamp: new Date().toISOString(),
      isRealAI: false
    });
  }
}