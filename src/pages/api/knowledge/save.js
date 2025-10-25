// src/pages/api/knowledge/save.js - 修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import prisma from '../../../lib/prisma';

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
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('💾 开始处理知识库保存请求');
    
    const session = await getServerSession(req, res, authOptions);
    
    let userId = 1;
    if (session?.user?.id) {
      userId = parseInt(session.user.id, 10);
      if (isNaN(userId)) {
        console.warn('用户ID格式错误，使用默认值');
        userId = 1;
      }
      console.log('✅ 用户已认证:', userId);
    } else {
      console.warn('⚠️ 未找到用户会话，使用默认用户ID');
    }

    const { title, content, category, tags, source } = req.body;
    
    console.log('📥 接收到的原始数据:', {
      userId,
      title,
      content: typeof content,
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

    // 构建保存数据
    const knowledgeData = {
      title: title && title.trim() ? title.trim() : null,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      category: category || '技术',
      tags: tags || 'AI对话,帮助文档',
      source: source || 'chat',
      userId: userId
    };

    console.log('📝 最终保存数据结构:', knowledgeData);

    // 保存到数据库
    const knowledge = await prisma.knowledge.create({
      data: knowledgeData,
    });

    console.log('✅ 知识点保存成功:', {
      id: knowledge.id,
      title: knowledge.title,
      contentLength: knowledge.content?.length || 0,
      category: knowledge.category,
      userId: knowledge.userId
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

    if (error.message?.includes('Unknown argument')) {
      errorMessage = '数据库字段不匹配';
      statusCode = 400;
    } else if (error.code === 'P2002') {
      errorMessage = '数据已存在';
      statusCode = 400;
    } else if (error.code === 'P2003') {
      errorMessage = '外键约束失败 - 用户不存在';
      statusCode = 400;
    } else if (error.code === 'P2010') {
      errorMessage = '原始查询失败';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
}