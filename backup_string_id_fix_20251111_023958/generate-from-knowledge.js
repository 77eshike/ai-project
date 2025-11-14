// pages/api/projects/generate-from-knowledge.js - 终极优化版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

// 🔧 配置常量
const CONFIG = {
  ALLOWED_METHODS: ['POST', 'OPTIONS'],
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_CONTENT_LENGTH: 10000,
  ALLOWED_ORIGINS: [
    'https://localhost:3001',
    'http://localhost:3001',
    'https://191413.ai',
    'http://191413.ai',
    'http://43.228.124.126:3000'
  ],
  PROJECT_TYPES: {
    STANDARD: 'STANDARD_PROJECT',
    DRAFT: 'DRAFT_PROJECT', 
    TEAM: 'TEAM_PROJECT',
    GENERAL: 'GENERAL'
  },
  PROJECT_STATUSES: {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    IN_PROGRESS: 'IN_PROGRESS'
  }
};

// 🔧 工具函数：文本清理和验证
class TextSanitizer {
  // 移除控制字符和不可见字符
  static cleanText(text, maxLength = null) {
    if (!text) return '';
    
    let cleaned = String(text)
      // 移除控制字符
      .replace(/[\x00-\x1F\x7F]/g, '')
      // 移除 Unicode 控制字符
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // 移除转义序列
      .replace(/\\[^u]/g, '')
      .replace(/\\u[0-9A-Fa-f]{4}/g, '')
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      .trim();
    
    // 限制长度
    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
    }
    
    return cleaned;
  }

  // 清理标题
  static cleanTitle(title) {
    const cleaned = this.cleanText(title, CONFIG.MAX_TITLE_LENGTH);
    return cleaned || '未命名项目';
  }

  // 清理描述
  static cleanDescription(description) {
    return this.cleanText(description, CONFIG.MAX_DESCRIPTION_LENGTH);
  }

  // 清理项目内容
  static cleanContent(content) {
    return this.cleanText(content, CONFIG.MAX_CONTENT_LENGTH);
  }

  // 验证文本是否包含有效内容
  static hasValidContent(text) {
    if (!text) return false;
    const cleaned = this.cleanText(text);
    return cleaned.length > 0 && cleaned.length <= CONFIG.MAX_CONTENT_LENGTH;
  }
}

// 🔧 工具函数：设置 CORS 头
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', CONFIG.ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
}

// 🔧 工具函数：验证会话
async function validateSession(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return { valid: false, error: '请先登录' };
    }

    const userId = parseInt(session.user.id);
    if (isNaN(userId) || userId <= 0) {
      return { valid: false, error: '无效的用户ID' };
    }

    return { valid: true, userId, session };
  } catch (error) {
    console.error('会话验证失败:', error);
    return { valid: false, error: '会话验证失败' };
  }
}

// 🔧 工具函数：生成项目内容
class ProjectGenerator {
  static generateTitle(knowledgeContent) {
    if (!knowledgeContent) return '基于知识点生成的项目';
    
    const cleanContent = TextSanitizer.cleanText(knowledgeContent);
    const firstSentence = cleanContent.split(/[.!?。！？]/)[0] || cleanContent;
    let title = firstSentence.substring(0, 50).trim();
    
    // 如果标题太短，添加前缀
    if (title.length < 5) {
      title = '基于知识点生成的项目';
    }
    
    return TextSanitizer.cleanTitle(`项目 - ${title}`);
  }

  static generateDescription(knowledgeContent) {
    const cleanContent = TextSanitizer.cleanText(knowledgeContent);
    const preview = cleanContent.substring(0, 100);
    return TextSanitizer.cleanDescription(
      `基于知识点生成的项目: ${preview}${cleanContent.length > 100 ? '...' : ''}`
    );
  }

  static generateContent(knowledge, customPrompt = '') {
    const cleanKnowledgeContent = TextSanitizer.cleanText(knowledge.content);
    const cleanCustomPrompt = TextSanitizer.cleanText(customPrompt);
    
    const sections = [
      '# 项目方案',
      '',
      '## 基于知识点生成',
      '',
      `**来源分类:** ${knowledge.category || '未分类'}`,
      `**标签:** ${knowledge.tags || '无'}`,
      `**知识ID:** ${knowledge.id}`,
      '',
      '## 原始内容',
      '',
      cleanKnowledgeContent || '暂无内容',
      '',
      '## 项目计划',
      '',
      '### 1. 需求分析',
      '- 理解业务需求',
      '- 确定项目目标',
      '- 制定验收标准',
      '',
      '### 2. 方案设计', 
      '- 技术架构设计',
      '- 功能模块划分',
      '- 开发计划制定',
      '',
      '### 3. 开发实施',
      '- 环境搭建',
      '- 功能开发',
      '- 单元测试',
      '',
      '### 4. 测试验收',
      '- 集成测试',
      '- 用户验收测试',
      '- 问题修复',
      '',
      '### 5. 部署上线',
      '- 生产环境部署',
      '- 监控配置',
      '- 文档整理'
    ];

    if (cleanCustomPrompt) {
      sections.push('', '## 额外要求', '', cleanCustomPrompt);
    }

    return TextSanitizer.cleanContent(sections.join('\n'));
  }
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🚀 [${requestId}] 开始从知识点生成项目`);

  // 设置 CORS 头
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许',
      allowed: CONFIG.ALLOWED_METHODS,
      requestId
    });
  }

  try {
    // 验证会话
    const sessionValidation = await validateSession(req, res);
    if (!sessionValidation.valid) {
      console.warn(`🚫 [${requestId}] 用户未授权:`, sessionValidation.error);
      return res.status(401).json({ 
        success: false,
        error: sessionValidation.error,
        requestId
      });
    }

    const { userId } = sessionValidation;

    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON解析失败:`, parseError);
      return res.status(400).json({
        success: false,
        error: '无效的请求格式',
        requestId
      });
    }

    const { knowledgeId, customPrompt } = body;

    // 验证必需字段
    if (!knowledgeId) {
      return res.status(400).json({
        success: false,
        error: '缺少知识点ID',
        requestId
      });
    }

    // 验证知识点ID格式
    if (typeof knowledgeId !== 'string' || knowledgeId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '无效的知识点ID格式',
        requestId
      });
    }

    console.log(`🔍 [${requestId}] 处理请求:`, {
      userId,
      knowledgeId,
      hasCustomPrompt: !!customPrompt
    });

    // 获取知识点内容
    const knowledge = await prisma.knowledge.findUnique({
      where: { 
        id: knowledgeId.trim() 
      },
      select: {
        id: true,
        title: true,
        content: true,
        userId: true,
        category: true,
        tags: true,
        createdAt: true
      }
    });

    if (!knowledge) {
      console.warn(`❌ [${requestId}] 知识点不存在:`, knowledgeId);
      return res.status(404).json({
        success: false,
        error: '知识点不存在',
        requestId
      });
    }

    // 验证权限
    if (knowledge.userId !== userId) {
      console.warn(`🚫 [${requestId}] 权限不足:`, { knowledgeUserId: knowledge.userId, currentUserId: userId });
      return res.status(403).json({
        success: false,
        error: '无权操作此知识点',
        requestId
      });
    }

    // 检查知识点内容是否有效
    if (!TextSanitizer.hasValidContent(knowledge.content)) {
      console.warn(`⚠️ [${requestId}] 知识点内容无效:`, knowledge.id);
      return res.status(400).json({
        success: false,
        error: '知识点内容无效或为空',
        requestId
      });
    }

    // 检查是否已有生成的项目
    const existingProject = await prisma.project.findFirst({
      where: {
        knowledgeSourceId: knowledgeId,
        ownerId: userId
      },
      select: {
        id: true,
        title: true,
        status: true
      }
    });

    if (existingProject) {
      console.log(`ℹ️ [${requestId}] 项目已存在:`, existingProject.id);
      return res.status(409).json({
        success: false,
        error: '已从该知识点生成过项目',
        existingProjectId: existingProject.id,
        existingProjectTitle: existingProject.title,
        requestId
      });
    }

    // 生成项目数据
    const projectTitle = ProjectGenerator.generateTitle(knowledge.content);
    const projectDescription = ProjectGenerator.generateDescription(knowledge.content);
    const projectContent = ProjectGenerator.generateContent(knowledge, customPrompt);

    console.log(`📝 [${requestId}] 生成项目数据:`, {
      title: projectTitle,
      descriptionLength: projectDescription.length,
      contentLength: projectContent.length
    });

    // 使用事务创建项目和相关记录
    const project = await prisma.$transaction(async (tx) => {
      // 创建项目
      const newProject = await tx.project.create({
        data: {
          title: projectTitle,
          description: projectDescription,
          content: projectContent,
          ownerId: userId,
          status: CONFIG.PROJECT_STATUSES.DRAFT,
          type: CONFIG.PROJECT_TYPES.STANDARD,
          visibility: 'PRIVATE',
          knowledgeSourceId: knowledgeId
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          type: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // 添加创建者为项目成员
      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: userId,
          role: 'OWNER'
        }
      });

      // 更新知识点的最后使用时间
      await tx.knowledge.update({
        where: { id: knowledgeId },
        data: { 
          updatedAt: new Date(),
          lastUsedAt: new Date()
        }
      });

      return newProject;
    });

    console.log(`✅ [${requestId}] 项目生成成功:`, {
      projectId: project.id,
      title: project.title
    });

    // 成功响应
    res.status(201).json({
      success: true,
      data: {
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          type: project.type,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        },
        source: {
          knowledgeId: knowledge.id,
          knowledgeTitle: knowledge.title
        }
      },
      message: `✅ 已从知识点生成项目: ${project.title}`,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 生成项目失败:`, {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    let errorMessage = '生成项目失败';
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';

    // 处理特定错误类型
    if (error.message?.includes('InvalidArg') || error.message?.includes('unexpected end of hex escape')) {
      errorMessage = '数据格式错误，包含无效字符';
      statusCode = 400;
      errorCode = 'INVALID_DATA_FORMAT';
    } else if (error.code === 'P2002') {
      errorMessage = '项目已存在';
      statusCode = 409;
      errorCode = 'PROJECT_ALREADY_EXISTS';
    } else if (error.code === 'P2025') {
      errorMessage = '相关记录不存在';
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
    } else if (error.code === 'P1017') {
      errorMessage = '数据库连接失败';
      statusCode = 503;
      errorCode = 'DATABASE_UNAVAILABLE';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      code: errorCode,
      requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        debugCode: error.code
      })
    });
  }
}

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
};

// 🔧 导出工具类用于测试
export { TextSanitizer, ProjectGenerator };