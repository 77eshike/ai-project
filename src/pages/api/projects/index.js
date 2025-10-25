import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔍 项目API请求:', { 
    method: req.method, 
    url: req.url,
    query: req.query 
  });

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn('🚫 未授权访问:', { hasSession: !!session, userId: session?.user?.id });
      return res.status(401).json({ 
        success: false,
        error: '未经授权的访问' 
      });
    }

    // 将用户 ID 转换为数字
    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      console.error('❌ 无效的用户ID:', session.user.id);
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID' 
      });
    }

    console.log('📂 项目API处理:', { 
      method: req.method, 
      userId,
      path: req.url 
    });

    // 获取项目列表
    if (req.method === 'GET') {
      return await getProjects(req, res, userId);
    }

    // 创建新项目
    if (req.method === 'POST') {
      return await createProject(req, res, userId);
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });

  } catch (error) {
    console.error('❌ 项目API错误:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: process.env.NODE_ENV === 'development' ? error.code : undefined
    });
  }
}

// 获取项目列表 - 修复版本
async function getProjects(req, res, userId) {
  try {
    const { 
      type, 
      status, 
      search,
      page = 1, 
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 查询参数:', { 
      userId, 
      type, 
      status, 
      search,
      page, 
      limit 
    });

    // 构建安全的查询条件 - 修正字段名
    const where = {
      OR: [
        { ownerId: userId },
        { projectMembers: { some: { userId: userId } } }  // ✅ 修正：projectMembers
      ]
    };

    // 安全地添加过滤条件
    if (type && typeof type === 'string') {
      const validTypes = ['DRAFT_PROJECT', 'STANDARD_PROJECT', 'TEAM_PROJECT', 'GENERAL'];
      if (validTypes.includes(type)) {
        where.type = type;
      }
    }

    if (status && typeof status === 'string') {
      const validStatuses = ['DRAFT', 'PUBLISHED', 'RECRUITING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      where.OR = [
        ...where.OR,
        { 
          title: { 
            contains: search.trim(), 
            mode: 'insensitive' 
          } 
        },
        { 
          description: { 
            contains: search.trim(), 
            mode: 'insensitive' 
          } 
        }
      ];
    }

    // 验证分页参数
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const skip = (pageNum - 1) * limitNum;

    // 验证排序参数
    const validSortFields = ['createdAt', 'updatedAt', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    const sortDir = sortOrder === 'asc' ? 'asc' : 'desc';

    console.log('📊 执行数据库查询...');

    // 获取项目列表 - 修正字段名
    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            image: true 
          }
        },
        projectMembers: {  // ✅ 修正：projectMembers
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                image: true 
              }
            }
          }
        },
        _count: {
          select: {
            projectMembers: true  // ✅ 修正：projectMembers
          }
        }
      },
      orderBy: { 
        [sortField]: sortDir 
      },
      skip,
      take: limitNum
    });

    // 获取总数
    const total = await prisma.project.count({ where });

    // 格式化响应数据 - 修正字段名
    const formattedProjects = projects.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      content: project.content,
      type: project.type,
      status: project.status,
      visibility: project.visibility,
      ownerId: project.ownerId,
      owner: project.owner,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isOwner: project.ownerId === userId,
      memberCount: project._count.projectMembers,  // ✅ 修正：projectMembers
      members: project.projectMembers || []  // ✅ 修正：projectMembers
    }));

    console.log(`✅ 获取项目成功: ${formattedProjects.length} 个项目`);

    return res.status(200).json({
      success: true,
      data: {
        projects: formattedProjects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        },
        filters: {
          type: type || 'all',
          status: status || 'all',
          search: search || ''
        }
      }
    });

  } catch (error) {
    console.error('❌ 获取项目列表失败:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // 处理特定的 Prisma 错误
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false,
        error: '记录未找到' 
      });
    } else if (error.code === 'P1017') {
      return res.status(503).json({ 
        success: false,
        error: '数据库连接失败，请稍后重试' 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: '获取项目列表失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 创建新项目 - 修复版本
async function createProject(req, res, userId) {
  try {
    const { title, description, content, type, visibility, knowledgeSourceId } = req.body;

    console.log('🆕 创建项目请求:', { 
      userId,
      title,
      type,
      knowledgeSourceId 
    });

    // 数据验证
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '项目标题不能为空' 
      });
    }

    if (title.length > 100) {
      return res.status(400).json({ 
        success: false,
        error: '项目标题不能超过100个字符' 
      });
    }

    // 验证知识库来源（如果提供）
    if (knowledgeSourceId) {
      try {
        const knowledge = await prisma.knowledge.findFirst({
          where: {
            id: knowledgeSourceId,
            userId: userId
          }
        });

        if (!knowledge) {
          return res.status(404).json({ 
            success: false,
            error: '知识库来源不存在或无权访问' 
          });
        }
      } catch (knowledgeError) {
        console.warn('⚠️ 知识库查询失败:', knowledgeError.message);
        // 如果知识库查询失败，继续创建项目但不关联知识库
      }
    }

    // 准备项目数据
    const projectData = {
      title: title.trim(),
      description: description?.trim() || '',
      content: content || '',
      type: type || 'DRAFT_PROJECT',
      visibility: visibility || 'PRIVATE',
      ownerId: userId,
      status: 'DRAFT'
    };

    // 只有在知识库ID有效时才添加关联
    if (knowledgeSourceId) {
      projectData.knowledgeSourceId = knowledgeSourceId;
    }

    console.log('📝 创建项目数据:', projectData);

    // 创建项目
    const project = await prisma.project.create({
      data: projectData,
      include: {
        owner: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            image: true 
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

    // 获取完整的项目信息（包含成员信息）
    const completeProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        owner: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            image: true 
          }
        },
        projectMembers: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                image: true 
              }
            }
          }
        },
        _count: {
          select: {
            projectMembers: true
          }
        }
      }
    });

    console.log('✅ 项目创建成功:', { 
      id: completeProject.id, 
      title: completeProject.title 
    });

    return res.status(201).json({
      success: true,
      data: {
        project: {
          id: completeProject.id,
          title: completeProject.title,
          description: completeProject.description,
          content: completeProject.content,
          type: completeProject.type,
          status: completeProject.status,
          visibility: completeProject.visibility,
          ownerId: completeProject.ownerId,
          owner: completeProject.owner,
          createdAt: completeProject.createdAt,
          updatedAt: completeProject.updatedAt,
          isOwner: true,
          memberCount: completeProject._count.projectMembers,
          members: completeProject.projectMembers || []
        }
      },
      message: '项目创建成功'
    });

  } catch (error) {
    console.error('❌ 创建项目失败:', error);
    
    // 处理特定的 Prisma 错误
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        success: false,
        error: '项目已存在' 
      });
    }

    return res.status(500).json({ 
      success: false,
      error: '创建项目失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}