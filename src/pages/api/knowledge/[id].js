// pages/api/knowledge/[id].js - 优化修复版本
import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

// 🔧 优化：统一的用户ID获取函数
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

// 🔧 优化：增强的内容处理函数
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
  if (Array.isArray(content)) {
    return JSON.stringify(content);
  } else {
    return JSON.stringify([content]);
  }
}

// 🔧 优化：增强的字段处理
function safeStringField(value, defaultValue = '') {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? defaultValue : trimmed;
  }
  const stringValue = String(value).trim();
  return stringValue === '' ? defaultValue : stringValue;
}

// 🔧 新增：数据验证函数
function validateKnowledgeData(data, isUpdate = false) {
  const errors = [];
  
  // 对于更新操作，内容可以为空（如果不更新内容）
  if (!isUpdate && (!data.content || data.content.trim().length === 0)) {
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
  const { id } = req.query;
  const requestId = Math.random().toString(36).substr(2, 9);

  console.log(`🔍 [${requestId}] 知识点API请求:`, {
    method: req.method,
    id: id,
    url: req.url
  });

  // CORS设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔧 优化：处理临时ID的请求
  if (!id || typeof id !== 'string') {
    console.log(`❌ [${requestId}] 无效的知识点ID:`, id);
    return res.status(400).json({ 
      success: false,
      error: '无效的知识点ID',
      requestId
    });
  }

  // 🔧 优化：如果是临时ID，直接返回成功，避免数据库查询
  if (id.startsWith('temp-')) {
    console.log(`🔄 [${requestId}] 处理临时ID请求: ${id}`);
    return res.status(200).json({ 
      success: true,
      message: '临时知识点操作成功',
      tempId: id,
      requestId
    });
  }

  try {
    // 🔧 优化：直接获取用户ID
    const userId = await getUserId(req, res);
    
    if (!userId) {
      console.log(`🔐 [${requestId}] 用户未认证或无法识别用户身份`);
      return res.status(401).json({ 
        success: false,
        error: '请先登录',
        requestId
      });
    }

    console.log(`🎯 [${requestId}] 使用用户ID: ${userId}`);

    switch (req.method) {
      case 'GET':
        return await handleGetKnowledge(req, res, id, userId, requestId);
      case 'PUT':
        return await handleUpdateKnowledge(req, res, id, userId, requestId);
      case 'DELETE':
        return await handleDeleteKnowledge(req, res, id, userId, requestId);
      default:
        return res.status(405).json({ 
          success: false,
          error: '方法不允许',
          requestId
        });
    }

  } catch (error) {
    console.error(`❌ [${requestId}] 知识点API全局错误:`, error);
    
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

async function handleGetKnowledge(req, res, id, userId, requestId) {
  try {
    console.log(`🔍 [${requestId}] 查询知识点 ${id}，用户ID: ${userId}`);
    
    const knowledge = await prisma.knowledge.findFirst({
      where: { id, userId }
    });

    if (!knowledge) {
      console.log(`❌ [${requestId}] 知识点不存在: ${id}，用户ID: ${userId}`);
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在',
        requestId
      });
    }

    console.log(`✅ [${requestId}] 找到知识点: ${id}`);
    
    // 格式化返回数据
    const formattedKnowledge = {
      id: knowledge.id,
      title: knowledge.title,
      content: knowledge.content,
      category: knowledge.category,
      tags: knowledge.tags,
      source: knowledge.source,
      userId: knowledge.userId,
      createdAt: knowledge.createdAt?.toISOString(),
      updatedAt: knowledge.updatedAt?.toISOString()
    };

    res.status(200).json({
      success: true,
      data: formattedKnowledge,
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 获取知识点失败:`, error);
    res.status(500).json({ 
      success: false,
      error: '获取知识点失败',
      requestId
    });
  }
}

async function handleDeleteKnowledge(req, res, id, userId, requestId) {
  try {
    console.log(`🗑️ [${requestId}] 删除知识点 ${id}，用户ID: ${userId}`);
    
    // 先检查存在性和权限
    const knowledge = await prisma.knowledge.findFirst({
      where: { id, userId }
    });

    if (!knowledge) {
      console.log(`❌ [${requestId}] 知识点不存在或无权限删除: ${id}，用户ID: ${userId}`);
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在或无权删除',
        requestId
      });
    }

    // 执行删除
    await prisma.knowledge.delete({
      where: { id }
    });

    console.log(`✅ [${requestId}] 知识点删除成功: ${id}`);

    res.status(200).json({ 
      success: true,
      message: '知识点删除成功',
      deletedId: id,
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 删除知识点失败:`, error);
    
    let errorMessage = '删除失败';
    let statusCode = 500;

    if (error.code === 'P2025') {
      errorMessage = '知识点不存在';
      statusCode = 404;
    } else if (error.code === 'P2003') {
      errorMessage = '存在关联数据，无法删除';
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message
      })
    });
  }
}

async function handleUpdateKnowledge(req, res, id, userId, requestId) {
  try {
    console.log(`✏️ [${requestId}] 更新知识点 ${id}，用户ID: ${userId}`);
    
    // 检查知识点是否存在
    const existingKnowledge = await prisma.knowledge.findFirst({
      where: { id, userId }
    });

    if (!existingKnowledge) {
      console.log(`❌ [${requestId}] 知识点不存在或无权限更新: ${id}，用户ID: ${userId}`);
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在或无权更新',
        requestId
      });
    }

    let updateData;
    try {
      updateData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log(`📦 [${requestId}] 更新数据:`, {
        title: updateData.title?.substring(0, 50),
        contentLength: updateData.content?.length,
        category: updateData.category,
        tags: updateData.tags
      });
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON解析失败:`, parseError);
      return res.status(400).json({ 
        success: false,
        error: '无效的JSON格式',
        requestId
      });
    }

    const { title, content, category, tags, source } = updateData;

    // 🔧 优化：数据验证
    const validationErrors = validateKnowledgeData(updateData, true);
    if (validationErrors.length > 0) {
      console.log(`❌ [${requestId}] 数据验证失败:`, validationErrors);
      return res.status(400).json({ 
        success: false,
        error: validationErrors.join(', '),
        requestId
      });
    }

    // 🔧 优化：构建更新数据
    const updateFields = {
      updatedAt: new Date()
    };

    // 只更新提供的字段
    if (title !== undefined) updateFields.title = safeStringField(title, null);
    if (content !== undefined) updateFields.content = processContent(content);
    if (category !== undefined) updateFields.category = safeStringField(category, '技术');
    if (tags !== undefined) updateFields.tags = safeStringField(tags, '未分类');
    if (source !== undefined) updateFields.source = safeStringField(source, 'manual');

    console.log(`📝 [${requestId}] 更新字段:`, updateFields);

    // 检查是否有实际更新的字段（除了updatedAt）
    const hasUpdates = Object.keys(updateFields).some(key => 
      key !== 'updatedAt' && updateFields[key] !== undefined
    );

    if (!hasUpdates) {
      console.log(`ℹ️ [${requestId}] 没有提供更新字段，跳过更新`);
      return res.status(200).json({
        success: true,
        data: existingKnowledge,
        message: '没有检测到更新字段',
        requestId
      });
    }

    // 执行更新
    const updatedKnowledge = await prisma.knowledge.update({
      where: { id },
      data: updateFields
    });

    console.log(`✅ [${requestId}] 知识点更新成功: ${id}`);

    // 格式化返回数据
    const formattedKnowledge = {
      id: updatedKnowledge.id,
      title: updatedKnowledge.title,
      content: updatedKnowledge.content,
      category: updatedKnowledge.category,
      tags: updatedKnowledge.tags,
      source: updatedKnowledge.source,
      userId: updatedKnowledge.userId,
      createdAt: updatedKnowledge.createdAt?.toISOString(),
      updatedAt: updatedKnowledge.updatedAt?.toISOString()
    };

    res.status(200).json({
      success: true,
      data: formattedKnowledge,
      message: '知识点更新成功',
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 更新知识点失败:`, error);
    
    let errorMessage = '更新失败';
    let statusCode = 500;

    if (error.code === 'P2025') {
      errorMessage = '知识点不存在';
      statusCode = 404;
    } else if (error.code === 'P2002') {
      errorMessage = '数据冲突，请检查输入数据';
      statusCode = 400;
    } else if (error.code === 'P2016') {
      errorMessage = '数据查询错误';
      statusCode = 400;
    } else if (error.code === 'P1017') {
      errorMessage = '数据库连接失败，请稍后重试';
      statusCode = 503;
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        code: error.code
      })
    });
  }
}

// 🔧 新增：导出配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '10mb',
  },
};