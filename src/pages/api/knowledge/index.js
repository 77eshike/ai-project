// pages/api/knowledge/index.js - 简化修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  // 统一的CORS设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📖 知识库API请求:', req.method);

    // 认证检查
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn('🚫 用户未认证');
      return res.status(401).json({ 
        success: false,
        error: '请先登录以访问知识库',
        data: [] // 确保前端能处理空数据
      });
    }

    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID',
        data: []
      });
    }

    console.log('✅ 用户认证通过:', { userId, email: session.user.email });

    if (req.method === 'GET') {
      // 获取知识库列表
      await handleGetKnowledge(req, res, userId);
    } else if (req.method === 'POST') {
      // 创建新知识点
      await handleCreateKnowledge(req, res, userId);
    } else {
      res.status(405).json({ 
        success: false,
        error: '方法不允许' 
      });
    }

  } catch (error) {
    console.error('❌ 知识库API错误:', error);
    
    // 提供友好的错误响应
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      data: [],
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 获取知识库列表
async function handleGetKnowledge(req, res, userId) {
  try {
    console.log('🔍 查询用户知识库:', userId);
    
    const knowledgeItems = await prisma.knowledge.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ 获取到 ${knowledgeItems.length} 条知识记录`);

    // 简化数据格式化
    const formattedItems = knowledgeItems.map(item => ({
      id: item.id,
      title: item.title || generateTitleFromContent(item.content),
      content: item.content || '',
      category: item.category || '未分类',
      tags: item.tags || '',
      source: item.source || 'manual',
      userId: item.userId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedItems,
      count: formattedItems.length,
      message: '获取知识库成功'
    });

  } catch (error) {
    console.error('❌ 获取知识库失败:', error);
    throw error;
  }
}

// 创建新知识点
async function handleCreateKnowledge(req, res, userId) {
  try {
    const { title, content, category, tags, source } = req.body;

    console.log('📝 创建知识点数据:', {
      title: title?.substring(0, 50),
      contentLength: content?.length,
      category,
      tags,
      source
    });

    // 基本验证
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '内容不能为空' 
      });
    }

    // 创建知识点
    const knowledge = await prisma.knowledge.create({
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        category: category || '技术',
        tags: tags || '',
        source: source || 'manual',
        userId: userId
      }
    });

    console.log('✅ 知识点创建成功:', knowledge.id);

    res.status(201).json({
      success: true,
      data: knowledge,
      message: '知识点创建成功'
    });

  } catch (error) {
    console.error('❌ 创建知识点失败:', error);
    
    // 处理数据库错误
    let errorMessage = '创建知识点失败';
    if (error.code === 'P2002') {
      errorMessage = '数据已存在';
    } else if (error.code === 'P2003') {
      errorMessage = '用户不存在';
    }
    
    res.status(400).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 从内容生成标题
function generateTitleFromContent(content) {
  if (!content) return '未命名文档';
  
  try {
    // 尝试解析JSON内容（如果是AI对话保存的）
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed[0]?.content) {
      const text = parsed[0].content;
      return text.substring(0, 30) + (text.length > 30 ? '...' : '');
    }
  } catch {
    // 不是JSON，直接使用内容
  }
  
  return content.substring(0, 30) + (content.length > 30 ? '...' : '');
}