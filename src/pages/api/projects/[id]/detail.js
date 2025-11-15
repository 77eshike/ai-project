// src/pages/api/projects/[id]/detail.js - 新数据模型适配API
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
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

    console.log('🔍 获取项目详情:', { projectId: id, userId: session.user.id });

    // 使用新数据模型查询项目
    const project = await prisma.project.findUnique({
      where: { 
        id: id 
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        collaborators: {
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
        comments: {
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
        knowledgePoints: {
          include: {
            knowledge: {
              select: {
                id: true,
                title: true,
                category: true
              }
            }
          }
        },
        _count: {
          select: {
            collaborators: true,
            comments: true,
            knowledgePoints: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: '项目不存在' 
      });
    }

    // 检查权限
    const hasAccess = project.authorId === session.user.id || 
                     project.collaborators.some(collab => collab.userId === session.user.id) ||
                     project.isPublic;

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false,
        error: '无权访问此项目' 
      });
    }

    // 格式化响应数据，适配新数据模型
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
      isPublic: project.isPublic,
      ownerId: project.authorId,
      owner: project.author,
      authorId: project.authorId,
      author: project.author,
      collaborators: project.collaborators,
      comments: project.comments,
      knowledgePoints: project.knowledgePoints,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isOwner: project.authorId === session.user.id,
      memberCount: project._count.collaborators + 1, // 包括作者
      commentCount: project._count.comments,
      knowledgePointCount: project._count.knowledgePoints
    };

    res.status(200).json({
      success: true,
      data: {
        project: formattedProject
      }
    });

  } catch (error) {
    console.error('❌ 获取项目详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}