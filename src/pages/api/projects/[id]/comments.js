// src/pages/api/projects/[id]/comments.js - 完整修复版本
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// 🔧 配置常量
const CONFIG = {
  ALLOWED_METHODS: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  MAX_COMMENT_LENGTH: 1000,
  MIN_COMMENT_LENGTH: 2,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  CACHE_DURATION: 2 * 60 * 1000,
  ALLOWED_ORIGINS: [
    'https://localhost:3001',
    'http://localhost:3001',
    'https://191413.ai',
    'http://191413.ai',
    'http://43.228.124.126:3000',
    'http://localhost:3000',
    'https://localhost:3000'
  ],
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 10
  }
};

// 🔧 内存缓存用于限流
const requestCounts = new Map();

// 🔧 工具函数：文本清理
class TextSanitizer {
  static cleanText(text, maxLength = null) {
    if (!text) return '';
    
    let cleaned = String(text)
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\\[^u]/g, '')
      .replace(/\\u[0-9A-Fa-f]{4}/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
    }
    
    return cleaned;
  }

  static validateCommentContent(content) {
    if (!content || content.trim().length === 0) {
      throw new Error('评论内容不能为空');
    }

    const cleanContent = this.cleanText(content);
    
    if (cleanContent.length === 0) {
      throw new Error('评论内容无效');
    }

    if (cleanContent.length < CONFIG.MIN_COMMENT_LENGTH) {
      throw new Error(`评论内容至少需要${CONFIG.MIN_COMMENT_LENGTH}个字符`);
    }

    if (cleanContent.length > CONFIG.MAX_COMMENT_LENGTH) {
      throw new Error(`评论内容不能超过${CONFIG.MAX_COMMENT_LENGTH}个字符`);
    }

    const sensitiveWords = ['赌博', '诈骗', '色情'];
    const hasSensitiveWord = sensitiveWords.some(word => 
      cleanContent.toLowerCase().includes(word.toLowerCase())
    );

    if (hasSensitiveWord) {
      throw new Error('评论内容包含不当词汇');
    }

    return cleanContent;
  }
}

// 🔧 工具函数：限流检查
function checkRateLimit(identifier) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT.WINDOW_MS;
  
  for (const [key, timestamps] of requestCounts.entries()) {
    const validTimestamps = timestamps.filter(time => time > windowStart);
    if (validTimestamps.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, validTimestamps);
    }
  }
  
  const userTimestamps = requestCounts.get(identifier) || [];
  const recentRequests = userTimestamps.filter(time => time > windowStart);
  
  if (recentRequests.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  requestCounts.set(identifier, recentRequests);
  return true;
}

// 🔧 工具函数：验证项目访问权限
async function validateProjectAccess(projectId, userId) {
  if (!projectId || !userId) {
    throw new Error('项目ID和用户ID不能为空');
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { projectMembers: { some: { userId: userId } } },
        { visibility: 'PUBLIC' }
      ],
      // 🔧 关键修复：使用有效的 ProjectStatus 枚举值
      status: { 
        notIn: ['ARCHIVED'] // 只排除已归档的项目
      }
    },
    select: { 
      id: true, 
      title: true,
      status: true,
      visibility: true,
      ownerId: true,
      allowPublicComments: true
    }
  });

  if (!project) {
    throw new Error('项目不存在或无权访问');
  }

  // 检查评论权限
  if (!project.allowPublicComments) {
    const isMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: userId
      }
    });
    
    if (!isMember && project.ownerId !== userId) {
      throw new Error('此项目未开启公开评论功能');
    }
  }

  return project;
}

// 🔧 工具函数：获取分页参数
function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(
    Math.max(1, parseInt(query.limit) || CONFIG.DEFAULT_PAGE_SIZE), 
    CONFIG.MAX_PAGE_SIZE
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// 🔧 工具函数：设置 CORS 头
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', CONFIG.ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`💬 [${requestId}] 项目评论API请求:`, { 
    method: req.method, 
    projectId: req.query.id,
    path: req.url,
    timestamp: new Date().toISOString()
  });

  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!CONFIG.ALLOWED_METHODS.includes(req.method)) {
      return res.status(405).json({ 
        success: false,
        error: '方法不允许',
        allowedMethods: CONFIG.ALLOWED_METHODS,
        requestId
      });
    }

    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn(`🚫 [${requestId}] 未授权访问评论API`);
      return res.status(401).json({ 
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED',
        requestId
      });
    }

    const { id: projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: '无效的项目ID',
        code: 'INVALID_PROJECT_ID',
        requestId
      });
    }

    const userId = session.user.id;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      console.error('❌ 无效的用户ID:', session.user.id);
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID',
        code: 'INVALID_USER_ID',
        requestId
      });
    }

    if (['POST', 'DELETE'].includes(req.method)) {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const identifier = `${clientIP}-${userId}`;
      
      if (!checkRateLimit(identifier)) {
        console.warn(`🚫 [${requestId}] 请求频率过高:`, identifier);
        return res.status(429).json({ 
          success: false,
          error: '请求过于频繁，请稍后重试',
          code: 'RATE_LIMIT_EXCEEDED',
          requestId
        });
      }
    }

    console.log(`🔍 [${requestId}] 验证项目权限:`, { projectId, userId });

    const project = await validateProjectAccess(projectId, userId);
    console.log(`✅ [${requestId}] 项目权限验证通过:`, project.title);

    switch (req.method) {
      case 'POST':
        return await handlePostComment(req, res, projectId, userId, requestId);
      
      case 'GET':
        return await handleGetComments(req, res, projectId, requestId);
      
      case 'DELETE':
        return await handleDeleteComment(req, res, projectId, userId, requestId);
      
      default:
        return res.status(405).json({ 
          success: false,
          error: '方法不允许',
          allowedMethods: CONFIG.ALLOWED_METHODS,
          requestId
        });
    }

  } catch (error) {
    console.error(`❌ [${requestId}] 项目评论API错误:`, error);
    
    let errorMessage = '服务器内部错误';
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';

    if (error.message?.includes('项目不存在') || error.message?.includes('无权访问')) {
      errorMessage = error.message;
      statusCode = error.message.includes('无权访问') ? 403 : 404;
      errorCode = error.message.includes('无权访问') ? 'ACCESS_DENIED' : 'PROJECT_NOT_FOUND';
    } else if (error.message?.includes('评论内容')) {
      errorMessage = error.message;
      statusCode = 400;
      errorCode = 'INVALID_COMMENT';
    } else if (error.code === 'P2003') {
      errorMessage = '项目或用户不存在';
      statusCode = 400;
      errorCode = 'FOREIGN_KEY_CONSTRAINT';
    } else if (error.code === 'P2025') {
      errorMessage = '记录未找到';
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
    } else if (error.code === 'P2014') {
      errorMessage = '数据关系错误';
      statusCode = 400;
      errorCode = 'RELATIONSHIP_ERROR';
    } else if (error.code === 'P2030') {
      errorMessage = '数据库字段验证失败';
      statusCode = 400;
      errorCode = 'FIELD_VALIDATION_ERROR';
    }
    
    return res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      code: errorCode,
      requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    });
  }
}

// 🔧 处理发表评论
async function handlePostComment(req, res, projectId, userId, requestId) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (parseError) {
    return res.status(400).json({
      success: false,
      error: '无效的 JSON 数据',
      code: 'INVALID_JSON',
      requestId
    });
  }

  const { content, parentId } = body;

  const cleanContent = TextSanitizer.validateCommentContent(content);

  if (parentId) {
    const parentComment = await prisma.projectComment.findUnique({
      where: { 
        id: parentId,
        projectId: projectId
      },
      select: { 
        id: true, 
        projectId: true,
        parentId: true
      }
    });

    if (!parentComment) {
      return res.status(400).json({
        success: false,
        error: '父评论不存在或不属于当前项目',
        code: 'INVALID_PARENT_COMMENT',
        requestId
      });
    }

    if (parentComment.parentId) {
      return res.status(400).json({
        success: false,
        error: '不能回复回复评论',
        code: 'NESTED_REPLY_NOT_ALLOWED',
        requestId
      });
    }
  }

  console.log(`📝 [${requestId}] 创建评论:`, { 
    projectId, 
    userId, 
    contentLength: cleanContent.length,
    parentId: parentId || null
  });

  const comment = await prisma.$transaction(async (tx) => {
    const newComment = await tx.projectComment.create({
      data: {
        projectId: projectId,
        userId: userId,
        content: cleanContent,
        parentId: parentId || null,
        metadata: {
          createdVia: 'web',
          userAgent: req.headers['user-agent'] || 'unknown',
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        }
      },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            image: true 
          }
        },
        ...(parentId && {
          parent: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        })
      }
    });

    return newComment;
  });

  console.log(`✅ [${requestId}] 评论创建成功:`, comment.id);

  return res.status(201).json({
    success: true,
    data: {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        user: comment.user,
        ...(comment.parent && {
          parent: {
            id: comment.parent.id,
            content: comment.parent.content,
            user: comment.parent.user
          }
        })
      }
    },
    message: '评论发布成功',
    code: 'COMMENT_CREATED',
    requestId,
    timestamp: new Date().toISOString()
  });
}

// 🔧 处理获取评论列表
async function handleGetComments(req, res, projectId, requestId) {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { 
    includeReplies = 'false',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  console.log(`📋 [${requestId}] 获取评论列表:`, { 
    projectId, 
    page, 
    limit, 
    includeReplies,
    sortBy,
    sortOrder
  });

  const validSortFields = ['createdAt', 'updatedAt'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';

  const whereCondition = {
    projectId: projectId,
    parentId: includeReplies === 'true' ? undefined : null
  };

  const [comments, total] = await Promise.all([
    prisma.projectComment.findMany({
      where: whereCondition,
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            image: true 
          }
        },
        ...(includeReplies === 'true' && {
          replies: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            },
            orderBy: { createdAt: 'asc' },
            take: 50
          }
        }),
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit
    }),
    prisma.projectComment.count({
      where: whereCondition
    })
  ]);

  console.log(`✅ [${requestId}] 获取评论成功: ${comments.length} 条评论`);

  return res.status(200).json({
    success: true,
    data: {
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        parentId: comment.parentId,
        user: comment.user,
        replyCount: comment._count.replies,
        ...(comment.replies && {
          replies: comment.replies.map(reply => ({
            id: reply.id,
            content: reply.content,
            createdAt: reply.createdAt,
            user: reply.user
          }))
        })
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: (page * limit) < total
      },
      summary: {
        totalComments: total,
        currentPageCount: comments.length
      }
    },
    code: 'COMMENTS_FETCHED',
    requestId,
    timestamp: new Date().toISOString()
  });
}

// 🔧 处理删除评论
async function handleDeleteComment(req, res, projectId, userId, requestId) {
  const { commentId } = req.query;

  if (!commentId) {
    return res.status(400).json({
      success: false,
      error: '缺少评论ID',
      code: 'MISSING_COMMENT_ID',
      requestId
    });
  }

  console.log(`🗑️ [${requestId}] 删除评论:`, { commentId, userId });

  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    include: {
      project: {
        select: { ownerId: true }
      },
      _count: {
        select: {
          replies: true
        }
      }
    }
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: '评论不存在',
      code: 'COMMENT_NOT_FOUND',
      requestId
    });
  }

  const isCommentAuthor = comment.userId === userId;
  const isProjectOwner = comment.project.ownerId === userId;

  if (!isCommentAuthor && !isProjectOwner) {
    return res.status(403).json({
      success: false,
      error: '无权删除此评论',
      code: 'DELETE_PERMISSION_DENIED',
      requestId
    });
  }

  await prisma.$transaction(async (tx) => {
    if (comment._count.replies > 0) {
      await tx.projectComment.deleteMany({
        where: { parentId: commentId }
      });
    }

    await tx.projectComment.delete({
      where: { id: commentId }
    });
  });

  console.log(`✅ [${requestId}] 评论删除成功:`, commentId);

  return res.status(200).json({
    success: true,
    message: '评论删除成功',
    code: 'COMMENT_DELETED',
    requestId,
    timestamp: new Date().toISOString(),
    deletedCount: 1 + comment._count.replies
  });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '10mb',
  },
};