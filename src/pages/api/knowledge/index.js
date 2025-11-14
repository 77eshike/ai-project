// /src/pages/api/knowledge/index.js - 简化修复版本
import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import auth from '../../../lib/auth';
import prisma from '../../../lib/prisma';

const CONFIG = {
  ALLOWED_METHODS: ['GET', 'OPTIONS'],
  CACHE_CONTROL: 'private, no-cache, no-store, must-revalidate',
  MAX_ITEMS: 1000
};

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
    const authOptions = auth?.authOptions || auth;
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

function formatKnowledgeItems(items) {
  return items.map(item => ({
    id: item.id,
    title: item.title || '未命名文档',
    content: item.content || '',
    category: item.category || '未分类',
    tags: item.tags || '',
    source: item.source || '用户添加',
    userId: item.userId,
    createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: item.updatedAt?.toISOString() || new Date().toISOString()
  }));
}

async function fetchKnowledgeFromDatabase(userId) {
  try {
    console.log(`🔄 从数据库查询知识库，用户ID: ${userId}`);
    
    const items = await prisma.knowledge.findMany({
      where: { 
        userId: userId 
      },
      orderBy: { 
        updatedAt: 'desc' 
      },
      take: CONFIG.MAX_ITEMS
    });

    console.log(`✅ 数据库查询成功:`, {
      用户ID: userId,
      数据条数: items.length
    });

    return items;
    
  } catch (error) {
    console.error('数据库查询失败:', error);
    throw error;
  }
}

function setResponseHeaders(res) {
  res.setHeader('Cache-Control', CONFIG.CACHE_CONTROL);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', CONFIG.ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 🔧 简化修复：提供示例数据
const SAMPLE_DATA = [
  {
    id: 'sample-1',
    title: '欢迎使用知识库',
    content: JSON.stringify([{ type: 'text', content: '这是您的第一个知识点！登录后即可开始管理您的个人知识库。' }]),
    category: '文档',
    tags: '欢迎,使用指南,示例',
    source: '系统示例',
    userId: 'default-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-2',
    title: 'React 最佳实践',
    content: JSON.stringify([{ type: 'text', content: '使用函数组件和Hooks，保持组件简洁，合理使用useMemo和useCallback优化性能。' }]),
    category: '技术',
    tags: 'React,前端,JavaScript',
    source: '技术文档',
    userId: 'default-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-3',
    title: '项目开发流程',
    content: JSON.stringify([{ type: 'text', content: '需求分析 → 技术设计 → 开发 → 测试 → 部署 → 监控维护' }]),
    category: '流程',
    tags: '项目管理,开发流程',
    source: '项目管理手册',
    userId: 'default-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`📖 [${requestId}] 知识库API请求开始`, {
    method: req.method,
    url: req.url
  });

  setResponseHeaders(res);

  try {
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (!CONFIG.ALLOWED_METHODS.includes(req.method)) {
      return res.status(405).json({ 
        success: false,
        error: '方法不允许',
        allowed: CONFIG.ALLOWED_METHODS,
        requestId
      });
    }

    // 🔧 简化修复：直接获取用户ID
    const userId = await getUserId(req, res);
    
    if (!userId) {
      console.log(`🔐 [${requestId}] 用户未认证或无法识别用户身份`);
      
      // 为未认证用户返回示例数据
      return res.status(200).json({
        success: true,
        data: SAMPLE_DATA,
        count: SAMPLE_DATA.length,
        authenticated: false,
        message: '使用示例数据，请登录后查看个人知识库',
        requestId
      });
    }

    console.log(`🎯 [${requestId}] 使用用户ID: ${userId}`);

    try {
      console.log(`🔍 [${requestId}] 查询用户知识库`);
      const knowledgeItems = await fetchKnowledgeFromDatabase(userId);
      
      console.log(`📊 [${requestId}] 查询结果:`, {
        用户ID: userId,
        数据条数: knowledgeItems.length
      });

      if (!knowledgeItems || knowledgeItems.length === 0) {
        console.log(`ℹ️ [${requestId}] 用户 ${userId} 的知识库为空`);
        
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
          authenticated: true,
          userId: userId,
          message: '知识库为空，开始创建第一个知识点吧！',
          requestId
        });
      }

      const formattedItems = formatKnowledgeItems(knowledgeItems);

      console.log(`✅ [${requestId}] 成功返回用户数据`, {
        itemCount: formattedItems.length,
        userId: userId
      });

      return res.status(200).json({
        success: true,
        data: formattedItems,
        count: formattedItems.length,
        authenticated: true,
        userId: userId,
        requestId
      });

    } catch (dbError) {
      console.error(`❌ [${requestId}] 数据库查询失败:`, dbError);
      
      // 数据库错误时返回示例数据作为降级方案
      return res.status(200).json({
        success: true,
        data: SAMPLE_DATA,
        count: SAMPLE_DATA.length,
        authenticated: true,
        userId: userId,
        error: '数据库暂时不可用，使用示例数据',
        message: '请稍后重试',
        requestId
      });
    }

  } catch (error) {
    console.error(`❌ [${requestId}] 知识库API全局错误:`, error);
    
    // 全局错误时返回示例数据
    return res.status(200).json({
      success: true,
      data: SAMPLE_DATA,
      count: SAMPLE_DATA.length,
      error: '系统暂时不可用',
      message: '知识库服务遇到问题，使用示例数据',
      requestId
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '10mb',
  },
};