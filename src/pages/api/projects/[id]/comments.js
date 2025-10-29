import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma'; // 🔧 修复：正确的相对路径

export default async function handler(req, res) {
  // 设置 CORS 头
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('💬 项目评论API请求:', { 
    method: req.method, 
    projectId: req.query.id,
    timestamp: new Date().toISOString()
  });

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    console.warn('🚫 未授权访问评论API');
    return res.status(401).json({ 
      success: false,
      error: '请先登录' 
    });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: '无效的项目ID' 
    });
  }

  try {
    // 将用户 ID 转换为数字
    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID' 
      });
    }

    console.log('🔍 验证项目权限:', { projectId: id, userId });

    // 检查项目访问权限
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: userId },
          { projectMembers: { some: { userId: userId } } },
          { visibility: 'PUBLIC' }
        ]
      },
      select: { id: true, title: true }
    });

    if (!project) {
      console.warn('❌ 项目访问被拒绝:', { projectId: id, userId });
      return res.status(404).json({ 
        success: false,
        error: '项目不存在或无权访问' 
      });
    }

    console.log('✅ 项目权限验证通过:', project.title);

    // 添加评论
    if (req.method === 'POST') {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ 
          success: false,
          error: '评论内容不能为空' 
        });
      }

      if (content.length > 1000) {
        return res.status(400).json({ 
          success: false,
          error: '评论内容不能超过1000个字符' 
        });
      }

      // 清理评论内容中的特殊字符
      const cleanContent = content
        .replace(/\\x[0-9A-Fa-f]{2}/g, '')
        .replace(/\\u[0-9A-Fa-f]{4}/g, '')
        .replace(/\\[^ux]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();

      if (cleanContent.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: '评论内容无效' 
        });
      }

      console.log('📝 创建评论:', { projectId: id, userId, contentLength: cleanContent.length });

      const comment = await prisma.projectComment.create({
        data: {
          projectId: id,
          userId: userId,
          content: cleanContent
        },
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
      });

      console.log('✅ 评论创建成功:', comment.id);

      return res.status(201).json({
        success: true,
        data: {
          comment: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: comment.user
          }
        },
        message: '评论发布成功'
      });
    }

    // 获取评论列表
    if (req.method === 'GET') {
      const { page = 1, limit = 20 } = req.query;
      
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);
      const skip = (pageNum - 1) * limitNum;

      console.log('📋 获取评论列表:', { projectId: id, page: pageNum, limit: limitNum });

      const [comments, total] = await Promise.all([
        prisma.projectComment.findMany({
          where: { projectId: id },
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                image: true 
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.projectComment.count({
          where: { projectId: id }
        })
      ]);

      console.log(`✅ 获取评论成功: ${comments.length} 条评论`);

      return res.status(200).json({
        success: true,
        data: {
          comments: comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: comment.user
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });
    }

    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });

  } catch (error) {
    console.error('❌ 项目评论API错误:', error);
    
    // 更详细的错误处理
    let errorMessage = '服务器内部错误';
    let statusCode = 500;

    if (error.code === 'P2003') {
      errorMessage = '外键约束失败 - 项目或用户不存在';
      statusCode = 400;
    } else if (error.code === 'P2025') {
      errorMessage = '记录未找到';
      statusCode = 404;
    } else if (error.message?.includes('Invalid')) {
      errorMessage = '数据格式错误';
      statusCode = 400;
    }
    
    return res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code
    });
  }
}