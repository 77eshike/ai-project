import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' });
  }

  const { id } = req.query;

  try {
    // 将用户 ID 转换为数字
    const userId = parseInt(session.user.id);

    // 检查项目访问权限
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId } } },
          { visibility: 'PUBLIC' }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        recruitments: {
          include: {
            _count: {
              select: {
                applications: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: '项目不存在或无权访问' 
      });
    }

    // 获取项目详情
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        project
      });
    }

    // 更新项目
    if (req.method === 'PUT') {
      // 检查权限 - 只有所有者和管理员可以编辑
      const isOwnerOrAdmin = project.ownerId === userId || 
        project.members.some(m => m.userId === userId && ['OWNER', 'ADMIN'].includes(m.role));

      if (!isOwnerOrAdmin) {
        return res.status(403).json({ 
          success: false,
          error: '无权编辑此项目' 
        });
      }

      const { title, description, content, status, visibility } = req.body;

      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(content && { content }),
          ...(status && { status }),
          ...(visibility && { visibility }),
          ...(status === 'PUBLISHED' && { publishedAt: new Date() })
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        project: updatedProject
      });
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });

  } catch (error) {
    console.error('项目详情API错误:', error);
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误: ' + error.message 
    });
  }
}