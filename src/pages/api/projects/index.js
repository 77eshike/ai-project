// src/pages/api/projects/index.js - 完整修复版本（支持看板筛选）
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from '../../../lib/prisma';

// 🔧 配置常量 - 更新为新的枚举值
const CONFIG = {
  ALLOWED_METHODS: ['GET', 'POST', 'OPTIONS'],
  MAX_PROJECTS_PER_PAGE: 100,
  DEFAULT_PAGE_SIZE: 20,
  // 🔧 更新：使用新的项目类型枚举
  VALID_PROJECT_TYPES: ['DRAFT_PROJECT', 'STANDARD_PROJECT', 'TEAM_PROJECT', 'RESEARCH_PROJECT'],
  // 🔧 更新：使用新的状态枚举
  VALID_PROJECT_STATUSES: ['DRAFT', 'IN_REVIEW', 'FINALIZING', 'RECRUITING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED', 'FAILED'],
  VALID_SORT_FIELDS: ['createdAt', 'updatedAt', 'title'],
  CACHE_CONTROL: 'private, no-cache, no-store, must-revalidate',
  // 🔧 新增：看板筛选类型
  VALID_BOARD_FILTERS: ['ALL', 'DRAFT', 'RECRUITING', 'IN_PROGRESS', 'COMPLETED']
};

// 🔧 工具函数：设置响应头
function setResponseHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', CONFIG.ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', CONFIG.CACHE_CONTROL);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

// 🔧 工具函数：验证用户会话 - 修复String ID处理
async function validateSession(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    console.log('🔐 会话验证详情:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userIdType: typeof session?.user?.id
    });

    if (!session?.user?.id) {
      console.warn('🚫 未授权访问: 缺少有效的用户会话');
      return { valid: false, error: '未经授权的访问', code: 'UNAUTHORIZED' };
    }

    // 🔧 修复：直接使用String ID，不进行数字转换
    const userId = session.user.id;
    
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      console.error('❌ 无效的用户ID:', session.user.id);
      return { valid: false, error: '无效的用户ID', code: 'INVALID_USER_ID' };
    }

    return { 
      valid: true, 
      userId, 
      session
    };
  } catch (error) {
    console.error('❌ 会话验证失败:', error);
    return { 
      valid: false, 
      error: '会话验证失败', 
      code: 'SESSION_VALIDATION_FAILED'
    };
  }
}

// 🔧 工具函数：验证查询参数 - 添加看板筛选支持
function validateQueryParams(query) {
  const { 
    type, 
    status, 
    search,
    filter, // 🔧 新增：看板筛选参数
    page = 1, 
    limit = CONFIG.DEFAULT_PAGE_SIZE,
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  } = query;

  // 验证分页参数
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(
    Math.max(1, parseInt(limit) || CONFIG.DEFAULT_PAGE_SIZE), 
    CONFIG.MAX_PROJECTS_PER_PAGE
  );

  // 验证排序参数
  const sortField = CONFIG.VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'updatedAt';
  const sortDir = sortOrder === 'asc' ? 'asc' : 'desc';

  // 验证过滤参数
  const validatedType = type && CONFIG.VALID_PROJECT_TYPES.includes(type) ? type : undefined;
  const validatedStatus = status && CONFIG.VALID_PROJECT_STATUSES.includes(status) ? status : undefined;
  const validatedSearch = search && typeof search === 'string' && search.trim().length > 0 ? search.trim() : undefined;
  
  // 🔧 新增：验证看板筛选参数
  const validatedFilter = filter && CONFIG.VALID_BOARD_FILTERS.includes(filter) ? filter : undefined;

  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
    sortBy: sortField,
    sortOrder: sortDir,
    type: validatedType,
    status: validatedStatus,
    search: validatedSearch,
    filter: validatedFilter // 🔧 新增
  };
}

// 🔧 简化的错误处理
function handleApiError(error, requestId, res) {
  console.error(`❌ [${requestId}] API错误:`, error.message);

  // 处理 Prisma 错误
  if (error.code?.startsWith('P')) {
    switch (error.code) {
      case 'P2025':
        return res.status(404).json({ 
          success: false,
          error: '记录未找到',
          requestId
        });
      case 'P1017':
      case 'P1001':
        return res.status(503).json({ 
          success: false,
          error: '数据库连接失败，请稍后重试',
          requestId
        });
      case 'P2002':
        return res.status(409).json({ 
          success: false,
          error: '记录已存在',
          requestId
        });
      default:
        return res.status(500).json({ 
          success: false,
          error: '数据库操作失败',
          requestId,
          ...(process.env.NODE_ENV === 'development' && { code: error.code })
        });
    }
  }

  // 通用错误处理
  return res.status(500).json({ 
    success: false,
    error: '服务器内部错误',
    requestId,
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🔍 [${requestId}] 项目API请求:`, { 
    method: req.method, 
    url: req.url,
    query: req.query
  });

  // 设置响应头
  setResponseHeaders(res);

  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] OPTIONS 请求处理完成`);
    return res.status(200).end();
  }

  try {
    // 验证会话
    const sessionValidation = await validateSession(req, res);
    if (!sessionValidation.valid) {
      console.warn(`🚫 [${requestId}] 会话验证失败:`, sessionValidation.error);
      return res.status(401).json({ 
        success: false,
        error: sessionValidation.error,
        code: sessionValidation.code,
        requestId
      });
    }

    const { userId } = sessionValidation;

    console.log(`📂 [${requestId}] 项目API处理:`, { 
      method: req.method, 
      userId,
      path: req.url 
    });

    // 路由到对应的处理方法
    if (req.method === 'GET') {
      return await handleGetProjects(req, res, userId, requestId);
    }

    if (req.method === 'POST') {
      return await handleCreateProject(req, res, userId, requestId);
    }

    console.warn(`❌ [${requestId}] 不支持的方法: ${req.method}`);
    return res.status(405).json({ 
      success: false,
      error: '方法不允许',
      allowed: CONFIG.ALLOWED_METHODS,
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 项目API全局错误:`, error);
    return handleApiError(error, requestId, res);
  }
}

// 🔧 修复的获取项目列表函数 - 添加看板筛选支持
async function handleGetProjects(req, res, userId, requestId) {
  try {
    // 验证查询参数
    const {
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      type,
      status,
      search,
      filter // 🔧 新增：看板筛选参数
    } = validateQueryParams(req.query);

    console.log(`🔍 [${requestId}] 查询参数:`, { 
      userId, 
      page, 
      limit,
      sortBy,
      sortOrder,
      filter // 🔧 新增
    });

    // 构建查询条件
    const where = {
      OR: [
        { ownerId: userId },
        { projectMembers: { some: { userId: userId } } }
      ]
    };

    // 🔧 新增：看板筛选逻辑
    if (filter) {
      switch (filter) {
        case 'DRAFT':
          // 待定项目：所有 projectType === 'DRAFT_PROJECT' 的项目
          where.projectType = 'DRAFT_PROJECT';
          break;
        case 'RECRUITING':
          // 招募中项目：已发布且状态为 RECRUITING
          where.projectType = { not: 'DRAFT_PROJECT' };
          where.status = 'RECRUITING';
          break;
        case 'IN_PROGRESS':
          // 进行中项目：已发布且状态为 IN_PROGRESS
          where.projectType = { not: 'DRAFT_PROJECT' };
          where.status = 'IN_PROGRESS';
          break;
        case 'COMPLETED':
          // 已完成项目：已发布且状态为 COMPLETED
          where.projectType = { not: 'DRAFT_PROJECT' };
          where.status = 'COMPLETED';
          break;
        // 'ALL' 不添加额外条件，显示所有项目
      }
    }

    // 添加其他过滤条件
    if (type) where.projectType = type; // 🔧 修复：使用 projectType 而不是 type
    if (status) where.status = status;
    if (search) {
      where.OR = [
        ...where.OR,
        { 
          title: { 
            contains: search, 
            mode: 'insensitive' 
          } 
        },
        { 
          description: { 
            contains: search, 
            mode: 'insensitive' 
          } 
        }
      ];
    }

    console.log(`📊 [${requestId}] 执行数据库查询...`, { where });

    // 获取项目列表和总数
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: {
            select: { 
              id: true, 
              name: true, 
              email: true
            }
          },
          projectMembers: {
            include: {
              user: {
                select: { 
                  id: true, 
                  name: true, 
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              projectMembers: true,
              projectComments: true
            }
          }
        },
        orderBy: { 
          [sortBy]: sortOrder 
        },
        skip,
        take: limit
      }),
      prisma.project.count({ where })
    ]);

    // 🔧 修复：格式化响应数据 - 使用新的字段名称
    const formattedProjects = projects.map(project => ({
      id: project.id,
      title: project.title || '未命名项目',
      description: project.description || '',
      content: project.content || '',
      aiFormattedContent: project.aiFormattedContent || '',
      // 🔧 修复：使用正确的字段名
      projectType: project.projectType || 'DRAFT_PROJECT',
      status: project.status || 'DRAFT',
      formattingStatus: project.formattingStatus || 'NOT_STARTED',
      formattingTemplate: project.formattingTemplate || '',
      currentReviewRound: project.currentReviewRound || 1,
      allowPublicComments: project.allowPublicComments ?? true,
      visibility: project.visibility || 'PRIVATE',
      ownerId: project.ownerId,
      owner: project.owner,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      isOwner: project.ownerId === userId,
      memberCount: project._count?.projectMembers || 0,
      commentCount: project._count?.projectComments || 0,
      members: project.projectMembers?.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role
      })) || []
    }));

    console.log(`✅ [${requestId}] 获取项目成功: ${formattedProjects.length} 个项目`);

    // 🔧 新增：统计各类项目数量用于看板显示
    const allProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { projectMembers: { some: { userId: userId } } }
        ]
      },
      select: {
        projectType: true,
        status: true
      }
    });

    const draftCount = allProjects.filter(p => p.projectType === 'DRAFT_PROJECT').length;
    const recruitingCount = allProjects.filter(p => p.projectType !== 'DRAFT_PROJECT' && p.status === 'RECRUITING').length;
    const inProgressCount = allProjects.filter(p => p.projectType !== 'DRAFT_PROJECT' && p.status === 'IN_PROGRESS').length;
    const completedCount = allProjects.filter(p => p.projectType !== 'DRAFT_PROJECT' && p.status === 'COMPLETED').length;

    return res.status(200).json({
      success: true,
      data: {
        projects: formattedProjects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: {
          type: type || 'all',
          status: status || 'all',
          search: search || '',
          filter: filter || 'ALL' // 🔧 新增：返回当前筛选状态
        },
        summary: {
          totalProjects: total,
          visibleProjects: formattedProjects.length,
          ownedProjects: projects.filter(p => p.ownerId === userId).length,
          // 🔧 新增：看板统计信息
          boardStats: {
            draft: draftCount,
            recruiting: recruitingCount,
            inProgress: inProgressCount,
            completed: completedCount,
            all: allProjects.length
          }
        }
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 获取项目列表失败:`, error);
    return handleApiError(error, requestId, res);
  }
}

// 🔧 修复的创建项目函数 - 使用新的默认值
async function handleCreateProject(req, res, userId, requestId) {
  try {
    // 解析请求体
    let projectData;
    try {
      projectData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: '无效的 JSON 数据',
        requestId
      });
    }

    // 🔧 修复：使用新的默认值 - 新项目默认为待定项目
    const { 
      title, 
      description, 
      projectType = 'DRAFT_PROJECT', // 🔧 修复：使用 projectType 而不是 type
      status = 'DRAFT' 
    } = projectData;

    // 验证必需字段
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '项目标题不能为空',
        requestId
      });
    }

    // 验证标题长度
    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        error: '项目标题不能超过200个字符',
        requestId
      });
    }

    // 验证类型和状态
    if (!CONFIG.VALID_PROJECT_TYPES.includes(projectType)) {
      return res.status(400).json({
        success: false,
        error: '无效的项目类型',
        requestId
      });
    }

    if (!CONFIG.VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: '无效的项目状态',
        requestId
      });
    }

    console.log(`🆕 [${requestId}] 创建新项目:`, {
      userId,
      title: title.substring(0, 50),
      projectType,
      status
    });

    // 创建项目 - 使用新的字段名
    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        projectType: projectType, // 🔧 修复：使用 projectType
        status: status,
        visibility: 'PRIVATE',
        ownerId: userId,
        content: '',
        formattingStatus: 'NOT_STARTED',
        currentReviewRound: 1,
        maxReviewRounds: 3,
        allowPublicComments: true
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            projectMembers: true,
            projectComments: true
          }
        }
      }
    });

    // 自动将创建者添加为项目成员
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: userId,
        role: 'OWNER'
      }
    });

    console.log(`✅ [${requestId}] 项目创建成功:`, { projectId: project.id });

    // 🔧 修复：格式化响应数据 - 使用新的字段名
    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      content: project.content,
      aiFormattedContent: project.aiFormattedContent,
      projectType: project.projectType,
      status: project.status,
      formattingStatus: project.formattingStatus,
      formattingTemplate: project.formattingTemplate,
      currentReviewRound: project.currentReviewRound,
      allowPublicComments: project.allowPublicComments,
      visibility: project.visibility,
      ownerId: project.ownerId,
      owner: project.owner,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      isOwner: true,
      memberCount: project._count?.projectMembers || 0,
      commentCount: project._count?.projectComments || 0,
      members: [{
        id: project.owner.id,
        name: project.owner.name,
        email: project.owner.email,
        role: 'OWNER'
      }]
    };

    return res.status(201).json({
      success: true,
      data: formattedProject,
      message: '项目创建成功',
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 创建项目失败:`, error);
    return handleApiError(error, requestId, res);
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