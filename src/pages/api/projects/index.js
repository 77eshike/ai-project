import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' });
  }

  try {
    // 获取项目列表
    if (req.method === 'GET') {
      const { type, status, page = 1, limit = 20 } = req.query;
      
      // 将用户 ID 转换为数字
      const userId = parseInt(session.user.id);
      
      const where = {
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId } } }
        ]
      };

      if (type) where.type = type;
      if (status) where.status = status;

      const projects = await prisma.project.findMany({
        where,
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
          _count: {
            select: {
              members: true,
              comments: true,
              recruitments: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      const total = await prisma.project.count({ where });

      return res.status(200).json({
        success: true,
        projects,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    }

    // 创建新项目
    if (req.method === 'POST') {
      const { title, description, content, type, visibility } = req.body;

      if (!title) {
        return res.status(400).json({ 
          success: false,
          error: '项目标题不能为空' 
        });
      }

      // 将用户 ID 转换为数字
      const userId = parseInt(session.user.id);

      const project = await prisma.project.create({
        data: {
          title,
          description,
          content: content || '',
          type: type || 'DRAFT_PROJECT',
          visibility: visibility || 'PRIVATE',
          ownerId: userId,
          status: 'DRAFT'
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true }
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

      return res.status(201).json({
        success: true,
        project
      });
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });

  } catch (error) {
    console.error('项目API错误:', error);
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误: ' + error.message 
    });
  }
}