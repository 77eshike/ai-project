// pages/api/knowledge/[id].js - 修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  // CORS 头设置
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    let userId = 1;
    if (session?.user?.id) {
      userId = parseInt(session.user.id, 10);
      if (isNaN(userId)) {
        userId = 1;
      }
    }

    console.log('🗑️ 删除知识点请求:', { 
      id, 
      userId,
      idType: typeof id
    });

    // 检查知识点是否存在且属于当前用户
    const knowledge = await prisma.knowledge.findFirst({
      where: {
        id: id, // 直接使用字符串 ID，不要 parseInt
        userId: userId
      }
    });

    if (!knowledge) {
      console.log('❌ 知识点不存在:', { id, userId });
      return res.status(404).json({ 
        success: false,
        error: '知识点不存在或无权删除' 
      });
    }

    console.log('✅ 找到知识点，准备删除:', knowledge.id);

    // 删除知识点
    await prisma.knowledge.delete({
      where: {
        id: id // 直接使用字符串 ID
      }
    });

    console.log('✅ 知识点删除成功:', id);

    res.status(200).json({ 
      success: true,
      message: '知识点删除成功'
    });

  } catch (error) {
    console.error('❌ 删除知识点错误:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '删除失败';
    if (error.message.includes('prisma') || error.message.includes('database')) {
      errorMessage = '数据库连接错误';
    } else if (error.message.includes('Record to delete does not exist')) {
      errorMessage = '知识点不存在';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}