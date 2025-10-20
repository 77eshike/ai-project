import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: '未经授权的访问' });
  }

  try {
    // 将用户 ID 转换为数字
    const userId = parseInt(session.user.id);

    // 并行获取所有统计数据
    const [
      projectsCount,
      conversationsCount,
      knowledgeCount,
      teamMembersCount
    ] = await Promise.all([
      // 项目数量
      prisma.project.count({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId: userId } } }
          ]
        }
      }),
      
      // 对话数量
      prisma.conversation.count({
        where: { userId }
      }),
      
      // 知识库数量
      prisma.knowledge.count({
        where: { userId }
      }),
      
      // 团队成员数量（在所有项目中的总成员数）
      prisma.projectMember.count({
        where: {
          project: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId: userId } } }
            ]
          }
        },
        distinct: ['userId']
      })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        projects: projectsCount,
        conversations: conversationsCount,
        knowledgeItems: knowledgeCount,
        teamMembers: teamMembersCount
      }
    });

  } catch (error) {
    console.error('获取仪表板统计失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取数据失败: ' + error.message 
    });
  }
}