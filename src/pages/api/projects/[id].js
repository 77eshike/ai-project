// pages/api/projects/[id].js - 修复版本
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from '../../../lib/prisma'; // 使用兼容性导出

export default async function handler(req, res) {
  // 🔧 修复：使用更灵活的 CORS 配置
  const allowedOrigins = [
    'https://localhost:3001',
    'http://localhost:3001',
    'https://191413.ai',
    'http://43.228.124.126:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🛠️ 项目详情API请求:', { 
    method: req.method, 
    projectId: req.query.id,
    timestamp: new Date().toISOString()
  });

  try {
    const session = await getServerSession(req, res, authOptions);
    
    console.log('🔍 会话验证:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    if (!session?.user?.id) {
      console.warn('🚫 未授权访问');
      return res.status(401).json({ 
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED'
      });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: '无效的项目ID'
      });
    }

    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID'
      });
    }

    console.log('📂 处理项目详情:', { projectId: id, userId });

    // 🔧 修复：确保数据库字段名称正确
    // 根据你的 Prisma schema，检查字段名是 members 还是 projectMembers
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: userId },
          { projectMembers: { some: { userId: userId } } } // 🔧 可能需要改为 projectMembers
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
        projectMembers: { // 🔧 可能需要改为 projectMembers
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
            projectMembers: true, // 🔧 可能需要改为 projectMembers
            comments: true
          }
        }
      }
    });

    console.log('🔍 项目查询结果:', project ? `找到项目: ${project.title}` : '未找到项目');

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: '项目不存在或无权访问',
        debug: {
          projectId: id,
          userId: userId
        }
      });
    }

    // 获取用户角色
    const getUserRole = () => {
      if (project.ownerId === userId) return 'OWNER';
      const member = project.projectMembers.find(m => m.userId === userId); // 🔧 可能需要改为 projectMembers
      return member ? member.role : 'VIEWER';
    };

    const userRole = getUserRole();
    const canEdit = ['OWNER', 'ADMIN'].includes(userRole);

    // 格式化项目数据
    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      content: project.content,
      type: project.type,
      status: project.status,
      ownerId: project.ownerId,
      owner: project.owner,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      userRole,
      permissions: {
        canEdit,
        canDelete: userRole === 'OWNER',
      },
      stats: {
        totalMembers: project._count.projectMembers, // 🔧 可能需要改为 projectMembers
        totalComments: project._count.comments,
      },
      members: project.projectMembers || [] // 🔧 可能需要改为 projectMembers
    };

    console.log(`✅ 返回项目详情, 用户角色: ${userRole}`);

    return res.status(200).json({
      success: true,
      data: {
        project: formattedProject
      }
    });

  } catch (error) {
    console.error('❌ 项目详情API错误:', error);
    
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: process.env.NODE_ENV === 'development' ? error.code : undefined
    });
  }
}