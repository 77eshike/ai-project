// /opt/ai-project/src/pages/api/projects/[id]/comments.js - 修复String ID版本
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
  CACHE_DURATION: 2 * 60 * 1000, // 2分钟缓存
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
    WINDOW_MS: 60 * 1000, // 1分钟
    MAX_REQUESTS: 10 // 最大请求数
  }
};

// 🔧 内存缓存用于限流
const requestCounts = new Map();

// 🔧 工具函数：文本清理
class TextSanitizer {
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
      // 移除 HTML 标签
      .replace(/<[^>]*>/g, '')
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      .trim();
    
    // 限制长度
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

    // 检查敏感词（可选）
    const sensitiveWords = ['赌博', '诈骗', '色情']; // 示例敏感词
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
  
  // 清理过期记录
  for (const [key, timestamps] of requestCounts.entries()) {
    const validTimestamps = timestamps.filter(time => time > windowStart);
    if (validTimestamps.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, validTimestamps);
    }
  }
  
  // 检查当前请求
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
      status: { 
        notIn: ['DELETED', 'ARCHIVED'] 
      }
    },
    select: { 
      id: true, 
      title: true,
      status: true,
      visibility: true,
      ownerId: true
    }
  });

  if (!project) {
    throw new Error('项目不存在或无权访问');
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

  // 设置 CORS 头
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 验证 HTTP 方法
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

    // 🔧 修复：直接使用String ID，不进行数字转换
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

    // 检查限流（POST 和 DELETE 操作）
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

    // 验证项目访问权限
    const project = await validateProjectAccess(projectId, userId);
    console.log(`✅ [${requestId}] 项目权限验证通过:`, project.title);

    // 处理不同HTTP方法
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
    
    // 错误处理
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
  // 解析请求体
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

  // 验证评论内容
  const cleanContent = TextSanitizer.validateCommentContent(content);

  // 验证父评论（如果存在）
  if (parentId) {
    const parentComment = await prisma.projectComment.findUnique({
      where: { 
        id: parentId,
        projectId: projectId // 确保父评论属于当前项目
      },
      select: { 
        id: true, 
        projectId: true,
        parentId: true // 防止嵌套回复
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

    // 防止多层嵌套回复
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

  // 使用事务确保数据一致性
  const comment = await prisma.$transaction(async (tx) => {
    // 创建评论
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

    // 更新项目评论计数
    await tx.project.update({
      where: { id: projectId },
      data: {
        commentCount: { increment: 1 },
        updatedAt: new Date()
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

  // 验证排序参数
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
            take: 50 // 限制回复数量
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

  // 查找评论并验证权限
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

  // 验证权限：评论作者或项目所有者可以删除
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

  // 使用事务删除评论和相关数据
  await prisma.$transaction(async (tx) => {
    // 如果有回复，先删除所有回复
    if (comment._count.replies > 0) {
      await tx.projectComment.deleteMany({
        where: { parentId: commentId }
      });
    }

    // 删除主评论
    await tx.projectComment.delete({
      where: { id: commentId }
    });

    // 更新项目评论计数
    const totalDeleted = 1 + comment._count.replies; // 主评论 + 所有回复
    await tx.project.update({
      where: { id: projectId },
      data: {
        commentCount: { decrement: totalDeleted },
        updatedAt: new Date()
      }
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

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '10mb',
  },
};