// src/pages/api/projects/new.js - 修复_count字段
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ 
        success: false,
        error: '请先登录' 
      });
    }

    console.log('📨 创建项目请求:', { 
      userId: session.user.id,
      body: req.body 
    });

    let projectData;
    try {
      projectData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error('❌ JSON解析错误:', parseError);
      return res.status(400).json({
        success: false,
        error: '无效的 JSON 数据格式'
      });
    }

    const { 
      title, 
      description = '', 
      content = '',
      projectType = 'DRAFT_PROJECT'
    } = projectData;

    // 验证必需字段
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '项目标题不能为空'
      });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        error: '项目标题不能超过200个字符'
      });
    }

    // 验证项目类型
    const validProjectTypes = ['DRAFT_PROJECT', 'STANDARD_PROJECT', 'TEAM_PROJECT', 'RESEARCH_PROJECT'];
    if (!validProjectTypes.includes(projectType)) {
      return res.status(400).json({
        success: false,
        error: '无效的项目类型'
      });
    }

    console.log('🆕 创建新项目:', {
      userId: session.user.id,
      title: title.substring(0, 50),
      projectType,
      descriptionLength: description?.length || 0,
      contentLength: content?.length || 0
    });

    // 创建项目
    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        content: content?.trim() || '',
        projectType: projectType,
        status: 'DRAFT',
        formattingStatus: 'NOT_STARTED',
        allowPublicComments: true,
        visibility: 'PRIVATE',
        owner: {
          connect: { id: session.user.id }
        },
        currentReviewRound: 1
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        _count: {
          select: {
            projectMembers: true, // 🔧 修复：使用 projectMembers 而不是 collaborators
            projectComments: true  // 🔧 修复：使用 projectComments 而不是 comments
          }
        }
      }
    });

    // 自动将创建者添加为项目成员
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        role: 'OWNER'
      }
    });

    console.log('✅ 项目创建成功:', { projectId: project.id });

    // 格式化响应数据
    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      content: project.content,
      projectType: project.projectType,
      status: project.status,
      formattingStatus: project.formattingStatus,
      allowPublicComments: project.allowPublicComments,
      isPublic: project.visibility === 'PUBLIC',
      visibility: project.visibility,
      authorId: project.ownerId,
      author: project.owner,
      ownerId: project.ownerId,
      owner: project.owner,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      isOwner: true,
      memberCount: project._count.projectMembers + 1, // 🔧 修复：使用 projectMembers 计数
      commentCount: project._count.projectComments    // 🔧 修复：使用 projectComments 计数
    };

    return res.status(201).json({
      success: true,
      data: {
        project: formattedProject
      },
      message: '项目创建成功'
    });

  } catch (error) {
    console.error('❌ 创建项目失败:', error);
    
    let errorMessage = '创建项目失败';
    let statusCode = 500;

    if (error.code === 'P2002') {
      errorMessage = '项目已存在';
      statusCode = 409;
    } else if (error.code === 'P2025') {
      errorMessage = '相关记录不存在';
      statusCode = 404;
    } else if (error.code === 'P1017') {
      errorMessage = '数据库连接失败';
      statusCode = 503;
    } else if (error.message?.includes('Unique constraint')) {
      errorMessage = '项目标题已存在';
      statusCode = 409;
    } else if (error.message?.includes('Unknown field')) {
      errorMessage = `数据模型字段错误: ${error.message}`;
      statusCode = 400;
    }
    
    return res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        code: error.code 
      })
    });
  }
}