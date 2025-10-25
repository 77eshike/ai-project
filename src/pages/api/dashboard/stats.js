import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from '../../../lib/prisma';

// 缓存配置（简单内存缓存）
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 获取用户统计数据的缓存键
const getCacheKey = (userId, type = 'stats') => {
  return `dashboard_${type}_${userId}_${new Date().toMinutes()}`; // 每分钟更新缓存键
};

// 清除用户缓存
const clearUserCache = (userId) => {
  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.includes(`_${userId}_`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
};

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn('🚫 未授权的仪表板访问尝试');
      return res.status(401).json({ 
        success: false,
        error: '未经授权的访问' 
      });
    }

    // 安全的用户ID转换
    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      console.error('❌ 无效的用户ID:', session.user.id);
      return res.status(400).json({ 
        success: false,
        error: '无效的用户ID' 
      });
    }

    console.log('📊 获取用户仪表板统计:', userId);

    // 检查缓存
    const cacheKey = getCacheKey(userId);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log('⚡ 使用缓存数据');
      return res.status(200).json({
        success: true,
        data: cachedData.data,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // 并行获取所有统计数据
    const [
      projectsCount,
      conversationsCount,
      knowledgeCount,
      teamMembersCount,
      recentActivity,
      storageUsage
    ] = await Promise.allSettled([
      // 项目数量 - 用户拥有或参与的项目
      prisma.project.count({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId: userId } } }
          ],
          status: { not: 'DELETED' }
        }
      }),
      
      // 对话数量 - 最近30天的活跃对话
      prisma.conversation.count({
        where: { 
          userId,
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
          }
        }
      }),
      
      // 知识库数量
      prisma.knowledge.count({
        where: { 
          userId,
          // 可选：排除已删除的知识点
          // status: 'ACTIVE'
        }
      }),
      
      // 团队成员数量（在所有项目中的唯一成员数）
      prisma.projectMember.count({
        where: {
          project: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId: userId } } }
            ],
            status: { not: 'DELETED' }
          },
          userId: { not: userId } // 排除自己
        },
        distinct: ['userId']
      }),
      
      // 最近活动（最近7天）
      prisma.conversation.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // 存储使用情况（估算）
      prisma.knowledge.aggregate({
        where: { userId },
        _sum: {
          // 假设有contentLength字段，如果没有可以估算
          // contentLength: true
        }
      })
    ]);

    // 处理并行查询结果
    const stats = {
      projects: projectsCount.status === 'fulfilled' ? projectsCount.value : 0,
      conversations: conversationsCount.status === 'fulfilled' ? conversationsCount.value : 0,
      knowledgeItems: knowledgeCount.status === 'fulfilled' ? knowledgeCount.value : 0,
      teamMembers: teamMembersCount.status === 'fulfilled' ? teamMembersCount.value : 0,
      recentActivity: recentActivity.status === 'fulfilled' ? recentActivity.value : 0,
      storageUsage: storageUsage.status === 'fulfilled' ? (storageUsage.value._sum.contentLength || 0) : 0
    };

    // 计算趋势数据（需要历史数据支持）
    const trends = await calculateTrends(userId, stats);

    // 构建完整响应
    const responseData = {
      stats,
      trends,
      summary: generateSummary(stats),
      lastUpdated: new Date().toISOString()
    };

    // 缓存结果
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    console.log('✅ 仪表板统计获取成功:', {
      userId,
      projects: stats.projects,
      conversations: stats.conversations,
      knowledge: stats.knowledgeItems,
      teamMembers: stats.teamMembers
    });

    res.status(200).json({
      success: true,
      data: responseData,
      cached: false,
      userId: userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 获取仪表板统计失败:', error);
    
    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    let errorMessage = '获取数据失败';
    
    if (error.message.includes('prisma') || error.message.includes('database')) {
      errorMessage = '数据库连接错误';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      errorMessage = '请求超时，请稍后重试';
      statusCode = 408;
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// 计算趋势数据
async function calculateTrends(userId, currentStats) {
  try {
    // 这里可以查询历史统计数据进行比较
    // 例如：对比上周的数据
    
    // 临时返回模拟数据
    return {
      projects: { change: 2, trend: 'up' }, // 新增2个项目
      conversations: { change: 15, trend: 'up' }, // 新增15个对话
      knowledgeItems: { change: 5, trend: 'up' }, // 新增5个知识点
      teamMembers: { change: 1, trend: 'up' } // 新增1个成员
    };
  } catch (error) {
    console.warn('趋势计算失败:', error);
    return {
      projects: { change: 0, trend: 'stable' },
      conversations: { change: 0, trend: 'stable' },
      knowledgeItems: { change: 0, trend: 'stable' },
      teamMembers: { change: 0, trend: 'stable' }
    };
  }
}

// 生成统计摘要
function generateSummary(stats) {
  const summaries = [];
  
  if (stats.projects === 0) {
    summaries.push('您还没有创建任何项目，开始您的第一个项目吧！');
  } else if (stats.projects === 1) {
    summaries.push('您有1个正在进行中的项目，继续加油！');
  } else {
    summaries.push(`您正在管理 ${stats.projects} 个项目，工作很有成效！`);
  }
  
  if (stats.conversations > 10) {
    summaries.push(`最近很活跃呢，已经进行了 ${stats.conversations} 次对话！`);
  }
  
  if (stats.knowledgeItems > 0) {
    summaries.push(`知识库中有 ${stats.knowledgeItems} 个知识点，这些都是宝贵的资产！`);
  }
  
  if (stats.teamMembers > 0) {
    summaries.push(`您与 ${stats.teamMembers} 位团队成员一起协作！`);
  }
  
  return summaries;
}

// 清除缓存端点（可选）
export async function clearDashboardCache(userId) {
  clearUserCache(userId);
}