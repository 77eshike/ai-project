// src/pages/api/knowledge/save.js - 简化修复版本
import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

// 🔧 简化修复：统一的用户ID获取函数
async function getUserId(req, res) {
  try {
    // 首先尝试从token获取 - 最可靠的方式
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    console.log('🔐 Token信息:', {
      hasToken: !!token,
      tokenId: token?.id,
      tokenSub: token?.sub,
      tokenEmail: token?.email
    });

    if (token?.id) {
      const userId = String(token.id).trim();
      console.log('✅ 从token.id获取用户ID:', userId);
      return userId;
    }
    
    if (token?.sub) {
      const userId = String(token.sub).trim();
      console.log('✅ 从token.sub获取用户ID:', userId);
      return userId;
    }

    // 备用方案：通过session获取
    const session = await getServerSession(req, res, authOptions);
    
    console.log('👤 Session信息:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionUserEmail: session?.user?.email
    });

    if (session?.user?.id) {
      const userId = String(session.user.id).trim();
      console.log('✅ 从session获取用户ID:', userId);
      return userId;
    }

    // 最后方案：通过邮箱查找用户
    if (session?.user?.email) {
      console.log('🔄 通过邮箱查找用户:', session.user.email);
      const user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase().trim() },
        select: { id: true }
      });
      
      if (user) {
        const userId = String(user.id).trim();
        console.log('✅ 通过邮箱查找用户ID成功:', userId);
        return userId;
      }
    }

    console.error('❌ 所有用户ID获取方法都失败了');
    return null;

  } catch (error) {
    console.error('❌ 获取用户ID过程中出错:', error);
    return null;
  }
}

// 🔧 简化修复：安全的内容处理函数
function processContent(content) {
  if (!content) return JSON.stringify([{ type: 'text', content: '' }]);
  
  if (typeof content === 'string') {
    try {
      // 尝试解析JSON，如果成功则保持原样
      const parsed = JSON.parse(content);
      // 确保是数组格式
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      } else {
        // 如果是对象，转换为数组格式
        return JSON.stringify([parsed]);
      }
    } catch (e) {
      // 如果不是JSON，转换为标准格式
      return JSON.stringify([{ type: 'text', content: content.trim() }]);
    }
  }
  
  // 如果是对象或数组，转换为JSON
  return JSON.stringify(Array.isArray(content) ? content : [content]);
}

// 🔧 简化修复：安全的字段处理
function safeStringField(value, defaultValue = '') {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'string') return value.trim() || defaultValue;
  return String(value).trim() || defaultValue;
}

// 🔧 简化修复：数据验证
function validateKnowledgeData(data) {
  const errors = [];
  
  if (!data.content || data.content.trim().length === 0) {
    errors.push('内容不能为空');
  }
  
  if (data.title && data.title.length > 100) {
    errors.push('标题不能超过100个字符');
  }
  
  if (data.category && data.category.length > 50) {
    errors.push('分类名称不能超过50个字符');
  }
  
  if (data.tags && data.tags.length > 200) {
    errors.push('标签总长度不能超过200个字符');
  }
  
  return errors;
}

export default async function handler(req, res) {
  // 设置响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    console.log(`💾 [${requestId}] 开始处理保存请求`);

    // 🔧 简化修复：直接获取用户ID
    const userId = await getUserId(req, res);
    
    if (!userId) {
      console.log(`🔐 [${requestId}] 用户未认证或无法识别用户身份`);
      return res.status(401).json({ 
        success: false,
        error: '请先登录' 
      });
    }

    console.log(`🎯 [${requestId}] 使用用户ID: ${userId}`);

    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log(`📦 [${requestId}] 请求体数据:`, {
        title: body.title?.substring(0, 50),
        contentLength: body.content?.length,
        category: body.category,
        tags: body.tags
      });
    } catch (e) {
      console.error(`❌ [${requestId}] JSON解析失败:`, e);
      return res.status(400).json({ 
        success: false,
        error: '无效的JSON格式' 
      });
    }

    const { title, content, category, tags, source } = body;

    // 🔧 简化修复：数据验证
    const validationErrors = validateKnowledgeData({ title, content, category, tags });
    if (validationErrors.length > 0) {
      console.log(`❌ [${requestId}] 数据验证失败:`, validationErrors);
      return res.status(400).json({ 
        success: false,
        error: validationErrors.join(', ') 
      });
    }

    // 🔧 简化修复：处理数据
    const cleanData = {
      title: safeStringField(title, null),
      content: processContent(content),
      category: safeStringField(category, '技术'),
      tags: safeStringField(tags, '未分类'),
      source: safeStringField(source, 'manual'),
      userId: userId
    };

    console.log(`📝 [${requestId}] 清理后的数据:`, {
      title: cleanData.title,
      contentLength: cleanData.content.length,
      category: cleanData.category,
      tags: cleanData.tags,
      userId: cleanData.userId
    });

    // 🔧 简化修复：数据库操作
    let result;
    try {
      result = await prisma.knowledge.create({
        data: cleanData
      });
      console.log(`✅ [${requestId}] 数据库保存成功:`, result.id);
    } catch (dbError) {
      console.error(`❌ [${requestId}] 数据库错误:`, dbError);
      
      // 简化的错误处理
      let errorMessage = '保存失败，请稍后重试';
      let statusCode = 500;
      
      if (dbError.code === 'P2002') {
        errorMessage = '数据已存在';
        statusCode = 400;
      } else if (dbError.code === 'P2003') {
        errorMessage = '关联数据不存在';
        statusCode = 400;
      } else if (dbError.code === 'P1017') {
        errorMessage = '数据库连接失败，请稍后重试';
        statusCode = 503;
      }
      
      return res.status(statusCode).json({ 
        success: false,
        error: errorMessage,
        code: dbError.code
      });
    }

    // 🔧 简化修复：格式化返回数据
    const responseData = {
      id: result.id,
      title: result.title,
      content: result.content,
      category: result.category,
      tags: result.tags,
      source: result.source,
      userId: result.userId,
      createdAt: result.createdAt?.toISOString(),
      updatedAt: result.updatedAt?.toISOString()
    };

    console.log(`✅ [${requestId}] 保存成功，返回数据`);

    // 成功响应
    res.status(200).json({
      success: true,
      data: responseData,
      message: '保存成功',
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 保存端点全局错误:`, error);
    
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    });
  }
}