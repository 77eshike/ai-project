// pages/api/projects/generate-from-knowledge.js - 修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

// 🔧 修复：正确的正则表达式
const cleanTextForDatabase = (text) => {
  if (!text) return '';
  
  return String(text)
    .replace(/\\x[0-9A-Fa-f]{2}/g, '') // 移除十六进制转义序列
    .replace(/\\u[0-9A-Fa-f]{4}/g, '') // 移除Unicode转义序列
    .replace(/\\[^ux]/g, '') // 移除其他反斜杠转义
    .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 🔧 修复：正确的Unicode范围
    .trim();
};

// 🔧 修复：正确的正则表达式
const cleanTitle = (title) => {
  if (!title) return '未命名项目';
  
  return String(title)
    .replace(/\\x[0-9A-Fa-f]{2}/g, '')
    .replace(/\\u[0-9A-Fa-f]{4}/g, '')
    .replace(/\\[^ux]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 🔧 修复：正确的Unicode范围
    .trim()
    .substring(0, 255);
};

export default async function handler(req, res) {
  // 设置 CORS 头
  const allowedOrigins = [
    'https://localhost:3001',
    'http://localhost:3001',
    'https://191413.ai',
    'http://43.228.124.126:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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
    console.log('🚀 开始从知识点生成项目');

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

    const { knowledgeId, customPrompt } = req.body;

    if (!knowledgeId) {
      return res.status(400).json({
        success: false,
        error: '缺少知识点ID'
      });
    }

    // 获取知识点内容
    const knowledge = await prisma.knowledge.findUnique({
      where: { id: knowledgeId },
      select: {
        id: true,
        content: true,
        userId: true,
        category: true,
        tags: true,
      }
    });

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        error: '知识点不存在'
      });
    }

    if (knowledge.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: '无权操作此知识点'
      });
    }

    // 检查是否已有生成的项目
    const existingProject = await prisma.project.findFirst({
      where: {
        knowledgeSourceId: knowledgeId,
        ownerId: userId
      }
    });

    if (existingProject) {
      return res.status(409).json({
        success: false,
        error: '已从该知识点生成过项目',
        existingProjectId: existingProject.id
      });
    }

    // 生成项目数据
    const projectTitle = cleanTitle(`项目 - ${generateProjectTitle(knowledge.content)}`);
    const projectDescription = cleanTextForDatabase(
      knowledge.content 
        ? `基于知识点生成的项目: ${knowledge.content.substring(0, 100)}${knowledge.content.length > 100 ? '...' : ''}`
        : '基于知识点生成的项目'
    );

    const projectContent = generateProjectContent(knowledge, customPrompt);

    // 创建项目
    const project = await prisma.project.create({
      data: {
        title: projectTitle,
        description: projectDescription,
        content: projectContent,
        ownerId: userId,
        status: 'DRAFT',
        type: 'STANDARD_PROJECT',
        visibility: 'PRIVATE',
        knowledgeSourceId: knowledgeId
      }
    });

    // 添加创建者为项目成员
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: userId,
        role: 'OWNER'
      }
    });

    console.log('✅ 项目生成成功:', project.id);

    res.status(201).json({
      success: true,
      data: {
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          type: project.type,
        }
      },
      message: `✅ 已从知识点生成项目: ${project.title}`
    });

  } catch (error) {
    console.error('❌ 生成项目失败:', error);
    
    let errorMessage = '生成项目失败';
    let statusCode = 500;

    if (error.message?.includes('InvalidArg') || error.message?.includes('unexpected end of hex escape')) {
      errorMessage = '数据格式错误，包含无效字符';
      statusCode = 400;
    } else if (error.code === 'P2002') {
      errorMessage = '项目已存在';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code
    });
  }
}

// 辅助函数
function generateProjectTitle(content) {
  if (!content) return '新项目';
  const cleanText = cleanTextForDatabase(content);
  const firstSentence = cleanText.split(/[.!?。！？]/)[0] || cleanText;
  let title = firstSentence.substring(0, 30).trim();
  return title || '基于知识点生成的项目';
}

function generateProjectContent(knowledge, customPrompt) {
  const cleanKnowledgeContent = cleanTextForDatabase(knowledge.content || '暂无内容');
  const cleanCustomPrompt = cleanTextForDatabase(customPrompt || '');
  
  return cleanTextForDatabase(
    `# 项目方案\n\n## 基于知识点生成\n\n**来源分类:** ${knowledge.category || '未分类'}\n**标签:** ${knowledge.tags || '无'}\n\n## 原始内容\n\n${cleanKnowledgeContent}\n\n## 项目计划\n\n1. 需求分析\n2. 方案设计\n3. 开发实施\n4. 测试验收\n5. 部署上线\n\n${cleanCustomPrompt ? `## 额外要求\n\n${cleanCustomPrompt}` : ''}`
  );
}