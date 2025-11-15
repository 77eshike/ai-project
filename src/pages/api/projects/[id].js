// src/pages/api/projects/[id].js - 修复_count字段
import { getServerSession } from "next-auth/next";

// 直接导入认证配置
let authOptions;
try {
  const authModule = await import('../../../../lib/auth');
  authOptions = authModule.authOptions || authModule.default?.authOptions || authModule.default;
} catch (error) {
  console.warn('使用备用认证配置:', error.message);
  authOptions = {
    providers: [],
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }
  };
}

// 直接导入 Prisma
let prisma;
try {
  const prismaModule = await import('../../../../lib/prisma');
  prisma = prismaModule.default || prismaModule.prisma || prismaModule;
} catch (error) {
  console.error('Prisma 导入失败:', error);
  try {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  } catch (prismaError) {
    console.error('无法初始化 Prisma:', prismaError);
    prisma = null;
  }
}

export default async function handler(req, res) {
  const { id } = req.query;
  const requestId = Math.random().toString(36).substr(2, 9);

  console.log(`🔍 [${requestId}] 项目详情API请求:`, { 
    method: req.method, 
    projectId: id 
  });

  // 设置响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 检查 Prisma 是否可用
  if (!prisma) {
    return res.status(503).json({ 
      success: false,
      error: '数据库服务暂时不可用',
      requestId
    });
  }

  try {
    // 验证会话
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn(`🚫 [${requestId}] 未授权访问`);
      return res.status(401).json({ 
        success: false,
        error: '请先登录',
        requestId
      });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: '无效的项目ID',
        requestId
      });
    }

    const userId = session.user.id;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID',
        requestId
      });
    }

    console.log(`🔍 [${requestId}] 查询项目详情:`, { projectId: id, userId });

    // 路由处理
    if (req.method === 'GET') {
      return await handleGetProject(req, res, id, userId, requestId);
    }

    if (req.method === 'PUT') {
      return await handleUpdateProject(req, res, id, userId, requestId);
    }

    if (req.method === 'DELETE') {
      return await handleDeleteProject(req, res, id, userId, requestId);
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许',
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 项目详情API错误:`, error);
    
    let errorMessage = '服务器内部错误';
    let statusCode = 500;

    if (error.code === 'P2025') {
      errorMessage = '项目不存在';
      statusCode = 404;
    } else if (error.code === 'P1017') {
      errorMessage = '数据库连接失败';
      statusCode = 503;
    } else if (error.message?.includes('Unknown field')) {
      errorMessage = `数据模型字段错误: ${error.message}`;
      statusCode = 400;
    }
    
    return res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      requestId
    });
  }
}

// 获取项目详情
async function handleGetProject(req, res, projectId, userId, requestId) {
  try {
    // 查找项目并验证权限
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { projectMembers: { some: { userId: userId } } }
        ]
      },
      include: {
        owner: {
          select: { 
            id: true, 
            name: true, 
            email: true 
          }
        },
        projectMembers: { // 🔧 修复：使用 projectMembers 而不是 collaborators
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
        projectComments: { // 🔧 修复：使用 projectComments 而不是 comments
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            projectMembers: true, // 🔧 修复：使用 projectMembers 而不是 collaborators
            projectComments: true  // 🔧 修复：使用 projectComments 而不是 comments
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: '项目不存在或无权访问',
        requestId
      });
    }

    // 格式化响应数据
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
      isPublic: project.visibility === 'PUBLIC',
      visibility: project.visibility,
      authorId: project.ownerId,
      author: project.owner,
      ownerId: project.ownerId,
      owner: project.owner,
      collaborators: project.projectMembers, // 🔧 修复：映射到 collaborators 以保持前端兼容
      comments: project.projectComments,     // 🔧 修复：映射到 comments 以保持前端兼容
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      isOwner: project.ownerId === userId,
      memberCount: project._count.projectMembers + 1,
      commentCount: project._count.projectComments
    };

    console.log(`✅ [${requestId}] 项目详情查询成功:`, project.id);

    return res.status(200).json({
      success: true,
      data: {
        project: formattedProject
      },
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 获取项目详情失败:`, error);
    throw error;
  }
}

// 更新项目
async function handleUpdateProject(req, res, projectId, userId, requestId) {
  try {
    let updateData;
    try {
      updateData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: '无效的 JSON 数据',
        requestId
      });
    }

    // 验证项目存在性和权限
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: '项目不存在或无权操作',
        requestId
      });
    }

    // 允许更新的字段
    const allowedUpdates = [
      'title', 'description', 'content', 'status', 'projectType', 
      'formattingStatus', 'formattingTemplate', 'currentReviewRound',
      'allowPublicComments', 'visibility', 'aiFormattedContent'
    ];
    const updates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
        if (key === 'isPublic') {
          updates.visibility = updateData[key] ? 'PUBLIC' : 'PRIVATE';
        } else {
          updates[key] = updateData[key];
        }
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有有效的更新字段',
        requestId
      });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            projectMembers: true // 🔧 修复：使用 projectMembers
          }
        }
      }
    });

    // 格式化响应
    const formattedProject = {
      id: updatedProject.id,
      title: updatedProject.title,
      description: updatedProject.description,
      content: updatedProject.content,
      aiFormattedContent: updatedProject.aiFormattedContent,
      projectType: updatedProject.projectType,
      status: updatedProject.status,
      formattingStatus: updatedProject.formattingStatus,
      formattingTemplate: updatedProject.formattingTemplate,
      currentReviewRound: updatedProject.currentReviewRound,
      isPublic: updatedProject.visibility === 'PUBLIC',
      visibility: updatedProject.visibility,
      authorId: updatedProject.ownerId,
      author: updatedProject.owner,
      ownerId: updatedProject.ownerId,
      owner: updatedProject.owner,
      createdAt: updatedProject.createdAt.toISOString(),
      updatedAt: updatedProject.updatedAt.toISOString(),
      isOwner: true,
      memberCount: updatedProject._count.projectMembers + 1
    };

    return res.status(200).json({
      success: true,
      data: {
        project: formattedProject
      },
      message: '项目更新成功',
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 更新项目失败:`, error);
    throw error;
  }
}

// 删除项目
async function handleDeleteProject(req, res, projectId, userId, requestId) {
  try {
    // 验证项目存在性和权限
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: '项目不存在或无权操作',
        requestId
      });
    }

    // 使用事务删除项目和相关数据
    await prisma.$transaction(async (tx) => {
      // 删除项目成员
      await tx.projectMember.deleteMany({
        where: { projectId: projectId }
      });

      // 删除评论
      await tx.projectComment.deleteMany({
        where: { projectId: projectId }
      });

      // 删除项目
      await tx.project.delete({
        where: { id: projectId }
      });
    });

    return res.status(200).json({
      success: true,
      message: '项目删除成功',
      requestId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] 删除项目失败:`, error);
    throw error;
  }
}