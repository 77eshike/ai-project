// pages/api/debug/project-detail.js
import { authOptions } from '../../../lib/auth' // 🔧 从 lib 导入
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://localhost:3001');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔍 项目详情调试请求:', req.query);

    const session = await getServerSession(req, res, authOptions);
    
    console.log('🔍 会话状态:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    if (!session?.user?.id) {
      return res.status(200).json({
        success: false,
        error: '未登录',
        session: null
      });
    }

    const userId = parseInt(session.user.id);
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: '缺少项目ID'
      });
    }

    console.log('📋 查询参数:', { projectId, userId });

    // 测试数据库连接
    const dbTest = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    console.log('🔍 数据库连接测试:', dbTest ? '成功' : '失败');

    // 查询项目
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId } } }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: {
            members: true,
            comments: true
          }
        }
      }
    });

    console.log('🔍 项目查询结果:', project ? '找到项目' : '未找到项目');

    if (!project) {
      return res.status(200).json({
        success: false,
        error: '项目不存在或无权访问',
        debug: {
          projectId,
          userId,
          userHasAccess: false
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          type: project.type,
          owner: project.owner,
          members: project.members,
          stats: project._count
        }
      },
      debug: {
        projectId,
        userId,
        userHasAccess: true,
        isOwner: project.ownerId === userId
      }
    });

  } catch (error) {
    console.error('❌ 项目详情调试错误:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}