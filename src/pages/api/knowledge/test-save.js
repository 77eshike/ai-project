// src/pages/api/knowledge/test-save.js - 测试端点
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: '未登录' });
    }

    // 硬编码测试数据
    const testData = {
      title: '测试知识点',
      content: JSON.stringify([{ type: 'text', content: '这是一个测试内容' }]),
      category: '技术',
      tags: '测试',
      source: 'manual',
      userId: session.user.id
    };

    console.log('🧪 测试保存数据:', testData);

    // 测试数据库连接和操作
    const result = await prisma.knowledge.create({
      data: testData
    });

    console.log('✅ 测试保存成功:', result.id);

    res.status(200).json({
      success: true,
      message: '测试保存成功',
      id: result.id
    });

  } catch (error) {
    console.error('❌ 测试保存失败:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: '数据库测试失败'
    });
  }
}