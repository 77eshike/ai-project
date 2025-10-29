// pages/api/knowledge/[id].js - 优化版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  // 统一的CORS设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 验证ID参数
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: '无效的知识点ID' 
    });
  }

  try {
    console.log(`🔍 知识点 ${id} ${req.method} 请求`);

    // 用户认证
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
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

    // 路由处理
    switch (req.method) {
      case 'GET':
        return await handleGetKnowledge(req, res, id, userId);
      case 'PUT':
        return await handleUpdateKnowledge(req, res, id, userId);
      case 'DELETE':
        return await handleDeleteKnowledge(req, res, id, userId);
      default:
        return res.status(405).json({ 
          success: false,
          error: '方法不允许' 
        });
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
    const knowledge = await prisma.knowledge.findFirst({
      where: { id, userId }
    });

    if (!knowledge) {
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在' 
      });
    }

    res.status(200).json({
      success: true,
      data: knowledge
    });

  } catch (error) {
    console.error('❌ 获取知识点失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取知识点失败'
    });
  }
}

// 删除知识点
async function handleDeleteKnowledge(req, res, id, userId) {
  try {
    // 先检查存在性和权限
    const knowledge = await prisma.knowledge.findFirst({
      where: { id, userId }
    });

    if (!knowledge) {
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在或无权删除' 
      });
    }

    // 执行删除
    await prisma.knowledge.delete({
      where: { id }
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
      error: errorMessage
    });
  }
}

// 更新知识点 - 简化版本
async function handleUpdateKnowledge(req, res, id, userId) {
  try {
    // 检查知识点是否存在
    const existingKnowledge = await prisma.knowledge.findFirst({
      where: { id, userId }
    });

    if (!existingKnowledge) {
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在或无权更新' 
      });
    }

    let updateData;
    try {
      updateData = req.body;
    } catch (parseError) {
      return res.status(400).json({ 
        success: false,
        error: '无效的JSON格式' 
      });
    }

    const { title, content, category, tags, source } = updateData;

    // 构建更新数据
    const updateFields = {
      updatedAt: new Date()
    };

    // 只更新提供的字段
    if (title !== undefined) updateFields.title = title?.trim() || null;
    if (content !== undefined) updateFields.content = content;
    if (category !== undefined) updateFields.category = category;
    if (tags !== undefined) updateFields.tags = tags;
    if (source !== undefined) updateFields.source = source;

    console.log('📝 更新字段:', Object.keys(updateFields));

    // 执行更新
    const updatedKnowledge = await prisma.knowledge.update({
      where: { id },
      data: updateFields
    });

    res.status(200).json({
      success: true,
      data: updatedKnowledge,
      message: '知识点更新成功'
    });

  } catch (error) {
    console.error('❌ 更新知识点失败:', error);
    
    let errorMessage = '更新失败';
    let statusCode = 500;

    if (error.code === 'P2025') {
      errorMessage = '知识点不存在';
      statusCode = 404;
    } else if (error.code === 'P2002') {
      errorMessage = '数据冲突';
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}