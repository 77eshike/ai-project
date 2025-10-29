// src/pages/api/knowledge/save.js - 安全修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  // CORS 头设置
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    console.log('💾 开始处理知识库保存请求');
    
    // 🔒 关键修复：强制用户认证，不再使用默认用户ID
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn('🚫 未授权访问尝试 - 用户未登录');
      return res.status(401).json({ 
        success: false,
        error: '请先登录以保存知识点' 
      });
    }

    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      console.error('❌ 无效的用户ID格式:', session.user.id);
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID格式' 
      });
    }

    console.log('✅ 用户已认证:', { 
      userId, 
      email: session.user.email,
      name: session.user.name 
    });

    // 解析请求体
    let requestBody;
    try {
      requestBody = req.body;
    } catch (parseError) {
      console.error('❌ JSON解析错误:', parseError);
      return res.status(400).json({ 
        success: false,
        error: '无效的JSON格式' 
      });
    }

    const { title, content, category, tags, source } = requestBody;
    
    console.log('📥 接收到的原始数据:', {
      userId,
      title: title?.substring(0, 50), // 只日志前50字符
      contentLength: content?.length,
      category,
      tags,
      source
    });

    // 数据验证
    if (!content) {
      return res.status(400).json({ 
        success: false,
        error: '内容不能为空' 
      });
    }

    // 清理和验证数据
    const cleanTitle = title?.trim() || null;
    const cleanContent = typeof content === 'string' ? content.trim() : JSON.stringify(content);
    const cleanCategory = (category || '技术').trim();
    const cleanTags = (tags || 'AI对话,帮助文档').trim();
    const cleanSource = (source || 'chat').trim();

    // 内容长度验证
    if (cleanContent.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '内容不能为空' 
      });
    }

    if (cleanContent.length > 50000) {
      return res.status(400).json({ 
        success: false,
        error: '内容长度不能超过50000个字符' 
      });
    }

    // 构建保存数据
    const knowledgeData = {
      title: cleanTitle,
      content: cleanContent,
      category: cleanCategory,
      tags: cleanTags,
      source: cleanSource,
      userId: userId
    };

    console.log('📝 最终保存数据结构:', {
      title: knowledgeData.title,
      contentLength: knowledgeData.content.length,
      category: knowledgeData.category,
      tags: knowledgeData.tags,
      source: knowledgeData.source,
      userId: knowledgeData.userId
    });

    // 保存到数据库
    const knowledge = await prisma.knowledge.create({
      data: knowledgeData,
    });

    console.log('✅ 知识点保存成功:', {
      id: knowledge.id,
      title: knowledge.title,
      contentLength: knowledge.content?.length || 0,
      category: knowledge.category,
      userId: knowledge.userId,
      createdAt: knowledge.createdAt
    });

    // 构建响应数据
    const responseData = {
      id: knowledge.id,
      title: knowledge.title,
      content: knowledge.content,
      category: knowledge.category,
      tags: knowledge.tags,
      source: knowledge.source,
      userId: knowledge.userId,
      createdAt: knowledge.createdAt,
      updatedAt: knowledge.updatedAt
    };

    res.status(200).json({ 
      success: true, 
      data: responseData,
      message: '知识点保存成功'
    });

  } catch (error) {
    console.error('❌ 保存知识点错误:', error);
    
    let errorMessage = '内部服务器错误';
    let statusCode = 500;

    // 更详细的错误处理
    if (error.message?.includes('Unknown argument')) {
      errorMessage = '数据库字段不匹配';
      statusCode = 400;
    } else if (error.code === 'P2002') {
      errorMessage = '数据已存在';
      statusCode = 400;
    } else if (error.code === 'P2003') {
      errorMessage = '用户不存在，请重新登录';
      statusCode = 401;
    } else if (error.code === 'P2010') {
      errorMessage = '数据库查询失败';
      statusCode = 500;
    } else if (error.code === 'P2011') {
      errorMessage = '数据验证失败';
      statusCode = 400;
    } else if (error.code === 'P2012') {
      errorMessage = '缺少必需的字段';
      statusCode = 400;
    } else if (error.code === 'P2013') {
      errorMessage = '参数缺失';
      statusCode = 400;
    } else if (error.code === 'P2025') {
      errorMessage = '记录不存在';
      statusCode = 404;
    }

    const errorResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };

    // 开发环境下提供详细错误信息
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
      errorResponse.code = error.code;
      errorResponse.stack = error.stack;
    }

    res.status(statusCode).json(errorResponse);
  }
}