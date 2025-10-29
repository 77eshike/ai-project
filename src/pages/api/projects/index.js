// src/pages/api/projects/index.js - 修复版本
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getPrisma } from '../../../lib/prisma'; // 🔧 修复：使用 getPrisma

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

    // 🔧 修复：使用 getPrisma() 获取 Prisma 客户端
    const prisma = await getPrisma();

    // 获取项目列表
    if (req.method === 'GET') {
      return await getProjects(req, res, userId, prisma);
    }

    // 创建新项目
    if (req.method === 'POST') {
      return await createProject(req, res, userId, prisma);
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
    
    // 处理数据库连接错误
    if (error.message.includes('数据库连接') || error.message.includes('Prisma')) {
      return res.status(503).json({ 
        success: false,
        error: '数据库服务暂时不可用，请稍后重试',
        code: 'DATABASE_UNAVAILABLE'
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: process.env.NODE_ENV === 'development' ? error.code : undefined
    });
  }
}

// 获取项目列表
async function getProjects(req, res, userId, prisma) {
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

    // 🔧 添加 Prisma 客户端验证
    console.log('🔍 Prisma 客户端验证:', {
      hasPrisma: !!prisma,
      hasProject: !!prisma.project,
      hasFindMany: typeof prisma.project?.findMany
    });

    if (!prisma || typeof prisma.project?.findMany !== 'function') {
      throw new Error('Prisma 客户端未正确初始化');
    }

    // 构建安全的查询条件
    const where = {
      OR: [
        { ownerId: userId },
        { projectMembers: { some: { userId: userId } } }
      ]
    };

    // ... 其余代码保持不变
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

    // 获取项目列表
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
      },
      orderBy: { 
        [sortField]: sortDir 
      },
      skip,
      take: limitNum
    });

    // 获取总数
    const total = await prisma.project.count({ where });

    // 格式化响应数据
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
      memberCount: project._count.projectMembers,
      members: project.projectMembers || []
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

// 创建新项目函数保持不变...