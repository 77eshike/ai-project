// pages/api/knowledge/[id].js - 完整修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  // CORS 设置
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'DELETE', 'PUT'].includes(req.method)) {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: '无效的知识点ID' 
    });
  }

  try {
    console.log('🔍 知识点操作请求:', { 
      method: req.method,
      id
    });

    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn('🚫 用户未登录');
      return res.status(401).json({ 
        success: false,
        error: '请先登录' 
      });
    }

    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: '无效的用户ID'
      });
    }

    console.log('✅ 用户已认证:', userId);

    if (req.method === 'PUT') {
      return await handleUpdateKnowledge(req, res, id, userId);
    } else if (req.method === 'GET') {
      return await handleGetKnowledge(req, res, id, userId);
    } else if (req.method === 'DELETE') {
      return await handleDeleteKnowledge(req, res, id, userId);
    }

  } catch (error) {
    console.error('❌ 知识点API错误:', error);
    
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 获取单个知识点
async function handleGetKnowledge(req, res, id, userId) {
  try {
    console.log('🔍 获取知识点详情:', id);

    const knowledge = await prisma.knowledge.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!knowledge) {
      console.log('❌ 知识点不存在:', id);
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在' 
      });
    }

    console.log('✅ 获取知识点成功:', knowledge.id);

    res.status(200).json({
      success: true,
      data: knowledge,
      message: '获取知识点成功'
    });

  } catch (error) {
    console.error('❌ 获取知识点失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取知识点失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 删除知识点
async function handleDeleteKnowledge(req, res, id, userId) {
  try {
    console.log('🗑️ 删除知识点请求:', { id, userId });

    const knowledge = await prisma.knowledge.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!knowledge) {
      console.log('❌ 知识点不存在或无权限:', { id, userId });
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在或无权删除' 
      });
    }

    console.log('✅ 找到知识点，准备删除:', {
      id: knowledge.id,
      title: knowledge.title
    });

    await prisma.knowledge.delete({
      where: {
        id: id
      }
    });

    console.log('✅ 知识点删除成功:', id);

    res.status(200).json({ 
      success: true,
      message: '知识点删除成功',
      deletedId: id
    });

  } catch (error) {
    console.error('❌ 删除知识点失败:', error);
    
    let errorMessage = '删除失败';
    let statusCode = 500;

    if (error.code === 'P2025') {
      errorMessage = '知识点不存在';
      statusCode = 404;
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 更新知识点 - 修复版本（正确处理所有字段）
async function handleUpdateKnowledge(req, res, id, userId) {
  try {
    console.log('📝 更新知识点请求开始:', { id, userId });

    // 检查知识点是否存在
    const existingKnowledge = await prisma.knowledge.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!existingKnowledge) {
      console.log('❌ 知识点不存在或无权限:', { id, userId });
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在或无权更新' 
      });
    }

    // 解析请求数据
    let updateData;
    try {
      updateData = req.body;
      console.log('📥 接收到的更新数据:', {
        title: updateData.title,
        contentLength: updateData.content?.length,
        category: updateData.category,
        tags: updateData.tags,
        source: updateData.source
      });
    } catch (parseError) {
      console.error('❌ JSON解析错误:', parseError);
      return res.status(400).json({ 
        success: false,
        error: '无效的JSON格式' 
      });
    }

    const { title, content, category, tags, source } = updateData;

    // 构建更新数据 - 使用所有可用字段
    const updateFields = {
      updatedAt: new Date()
    };

    // 更新所有字段，正确处理可选字段
    if (title !== undefined) {
      updateFields.title = title && title.trim() ? title.trim() : null;
    }
    if (content !== undefined) {
      updateFields.content = content || '';
    }
    if (category !== undefined) {
      updateFields.category = category || '技术';
    }
    if (tags !== undefined) {
      updateFields.tags = tags || '';
    }
    if (source !== undefined) {
      updateFields.source = source || 'manual';
    }

    console.log('🔧 准备更新的字段:', updateFields);

    try {
      // 执行更新
      const updatedKnowledge = await prisma.knowledge.update({
        where: { id: id },
        data: updateFields
      });

      console.log('✅ 知识点更新成功:', {
        id: updatedKnowledge.id,
        title: updatedKnowledge.title,
        category: updatedKnowledge.category,
        contentLength: updatedKnowledge.content?.length
      });

      res.status(200).json({
        success: true,
        data: updatedKnowledge,
        message: '知识点更新成功'
      });

    } catch (dbError) {
      console.error('❌ 数据库更新失败:', dbError);
      console.error('❌ 错误详情:', {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta
      });

      // 如果是字段不匹配错误，尝试使用更保守的更新方式
      if (dbError.message.includes('Unknown argument')) {
        console.log('🔄 尝试保守更新方式...');
        return await handleConservativeUpdate(id, updateFields, res);
      }

      let errorMessage = '数据库更新失败';
      let statusCode = 500;

      if (dbError.code === 'P2025') {
        errorMessage = '知识点不存在';
        statusCode = 404;
      } else if (dbError.code === 'P2002') {
        errorMessage = '数据冲突，请检查输入';
        statusCode = 400;
      } else if (dbError.code === 'P2016') {
        errorMessage = '查询错误，请检查ID格式';
        statusCode = 400;
      }

      res.status(statusCode).json({ 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        code: dbError.code
      });
    }

  } catch (error) {
    console.error('❌ 更新知识点失败:', error);
    
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 保守更新方式 - 只更新基本字段
async function handleConservativeUpdate(id, updateFields, res) {
  try {
    // 只保留基本字段
    const conservativeFields = {
      updatedAt: updateFields.updatedAt,
      content: updateFields.content || '',
      category: updateFields.category || '技术',
      tags: updateFields.tags || '',
      source: updateFields.source || 'manual'
    };

    console.log('🔄 保守更新字段:', conservativeFields);

    const updatedKnowledge = await prisma.knowledge.update({
      where: { id: id },
      data: conservativeFields
    });

    console.log('✅ 保守更新成功:', updatedKnowledge.id);

    res.status(200).json({
      success: true,
      data: updatedKnowledge,
      message: '知识点更新成功（使用保守模式）'
    });

  } catch (error) {
    console.error('❌ 保守更新失败:', error);
    
    res.status(500).json({ 
      success: false,
      error: '数据库字段不匹配，无法更新知识点',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}