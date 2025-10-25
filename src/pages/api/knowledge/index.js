// src/pages/api/knowledge/index.js - 修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    console.log('📖 获取知识库数据请求开始');

    const session = await getServerSession(req, res, authOptions);
    
    console.log('🔍 会话信息:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    if (!session?.user?.id) {
      console.warn('🚫 用户未认证，返回空数据');
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        authenticated: false,
        message: '请先登录以访问知识库'
      });
    }

    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      console.error('❌ 无效的用户ID:', session.user.id);
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID' 
      });
    }

    console.log('✅ 用户已认证:', { userId });

    // 从数据库获取用户数据
    const knowledgeItems = await prisma.knowledge.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ 从数据库获取 ${knowledgeItems.length} 条知识记录`);

    // 格式化数据 - 匹配 Prisma 模型
    const formattedItems = knowledgeItems.map(item => ({
      id: item.id, // String 类型
      title: item.title || (item.content ? 
        (item.content.substring(0, 50) + (item.content.length > 50 ? '...' : '')) 
        : '未命名文档'),
      content: item.content || '',
      category: item.category || '未分类',
      tags: item.tags || '',
      source: item.source || '用户添加',
      userId: item.userId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedItems,
      count: formattedItems.length,
      authenticated: true,
      userId: userId
    });

  } catch (error) {
    console.error('❌ 知识库API错误:', error);
    
    res.status(500).json({ 
      success: false,
      error: '获取知识库失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}