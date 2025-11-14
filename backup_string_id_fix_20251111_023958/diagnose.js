// src/pages/api/auth/diagnose.js - 完整修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';

// 🔧 配置常量
const CONFIG = {
  ALLOWED_METHODS: ['GET', 'OPTIONS'],
  DIAGNOSTIC_TIMEOUT: 10000, // 10秒超时
  CACHE_DURATION: 0, // 不缓存诊断结果
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  }
};

// 🔧 工具函数：安全的数据库操作
async function safeDatabaseCheck(prisma) {
  const results = {
    connected: false,
    tables: {},
    userCount: 0,
    sessionCount: 0,
    error: null
  };

  try {
    // 测试连接
    await prisma.$queryRaw`SELECT 1`;
    results.connected = true;

    // 检查关键表
    const tablesToCheck = ['User', 'Session', 'Account'];
    
    for (const table of tablesToCheck) {
      try {
        const count = await prisma[table].count();
        results.tables[table] = { exists: true, count };
      } catch (error) {
        results.tables[table] = { exists: false, error: error.message };
      }
    }

    // 获取用户和会话数量
    results.userCount = results.tables.User?.count || 0;
    results.sessionCount = results.tables.Session?.count || 0;

  } catch (error) {
    results.error = error.message;
    results.connected = false;
  }

  return results;
}

// 🔧 工具函数：Cookie 分析
function analyzeCookies(cookieHeader) {
  if (!cookieHeader) {
    return { total: 0, authCookies: [], raw: '无Cookie' };
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const authCookies = cookies.filter(cookie => 
    cookie.includes('next-auth') || 
    cookie.includes('auth') || 
    cookie.includes('session') ||
    cookie.includes('token')
  );

  return {
    total: cookies.length,
    authCookies: authCookies.map(cookie => {
      const [name, ...valueParts] = cookie.split('=');
      const value = valueParts.join('=');
      return {
        name: name.trim(),
        value: value ? `${value.substring(0, 10)}...` : '空值',
        secure: cookie.includes('Secure'),
        httpOnly: cookie.includes('HttpOnly')
      };
    }),
    raw: cookieHeader
  };
}

// 🔧 工具函数：环境检查
function checkEnvironment() {
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
    'NEXTAUTH_URL'
  ];

  const envStatus = {};
  const missingVars = [];

  requiredEnvVars.forEach(varName => {
    const isSet = !!process.env[varName];
    envStatus[varName] = {
      set: isSet,
      value: isSet ? '***' + process.env[varName].slice(-4) : '未设置'
    };
    
    if (!isSet) {
      missingVars.push(varName);
    }
  });

  return {
    nodeEnv: process.env.NODE_ENV || '未设置',
    requiredVars: envStatus,
    missingVars,
    allRequiredSet: missingVars.length === 0
  };
}

// 🔧 关键修复：会话深度分析 - 修复ID类型
async function analyzeSession(session, prisma, req) {
  if (!session?.user?.id) {
    return { exists: false };
  }

  try {
    // 🔧 关键修复：转换用户ID为数字类型
    let userId;
    try {
      const rawUserId = session.user.id;
      if (typeof rawUserId === 'string') {
        userId = parseInt(rawUserId, 10);
      } else if (typeof rawUserId === 'number') {
        userId = rawUserId;
      } else {
        throw new Error(`未知的用户ID类型: ${typeof rawUserId}`);
      }

      if (isNaN(userId) || userId <= 0) {
        throw new Error(`无效的用户ID数值: ${userId}`);
      }
    } catch (idError) {
      return {
        exists: true,
        userId: session.user.id,
        error: `用户ID转换失败: ${idError.message}`
      };
    }

    console.log(`🔄 诊断API用户ID转换: ${session.user.id} -> ${userId}`);

    // 🔧 使用转换后的数字ID查询数据库
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },  // ✅ 使用数字ID
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        status: true
      }
    });

    // 🔧 修复：检查会话表（如果使用数据库会话策略）
    let userSessions = [];
    try {
      userSessions = await prisma.session.findMany({
        where: { userId: userId },  // ✅ 使用数字ID
        select: { sessionToken: true, expires: true }
      });
    } catch (sessionError) {
      // 如果会话表不存在或使用JWT策略，这是正常的
      console.log('⚠️ 会话表查询失败（可能是JWT策略）:', sessionError.message);
    }

    return {
      exists: true,
      userId: session.user.id,  // 保持原始ID用于显示
      normalizedUserId: userId, // 添加转换后的ID
      userEmail: session.user.email,
      dbUser: dbUser ? {
        exists: true,
        id: dbUser.id,
        email: dbUser.email,
        status: dbUser.status,
        emailVerified: dbUser.emailVerified,
        createdAt: dbUser.createdAt
      } : { 
        exists: false,
        error: `用户ID ${userId} 在数据库中不存在`
      },
      sessions: {
        count: userSessions.length,
        active: userSessions.filter(s => new Date(s.expires) > new Date()).length
      },
      sessionMatch: userSessions.some(s => 
        s.sessionToken.includes(req.headers.cookie?.match(/next-auth\.session-token=([^;]+)/)?.[1] || '')
      ),
      idConversion: {
        original: session.user.id,
        normalized: userId,
        originalType: typeof session.user.id,
        normalizedType: typeof userId,
        success: true
      }
    };
  } catch (error) {
    console.error('❌ 会话分析错误:', error);
    return {
      exists: true,
      userId: session.user.id,
      error: `数据库查询失败: ${error.message}`
    };
  }
}

// 🔧 关键修复：更新健康评分计算
function calculateHealthScore(diagnosis) {
  let score = 100;

  // 环境变量缺失
  score -= diagnosis.environment.missingVars.length * 20;

  // 数据库问题
  if (!diagnosis.database.connected) score -= 30;
  if (!diagnosis.database.tables.User?.exists) score -= 20;

  // 会话问题
  if (!diagnosis.session.exists) score -= 10;
  
  // 🔧 修复：使用正确的字段检查用户存在性
  if (diagnosis.session.exists) {
    if (!diagnosis.session.dbUser?.exists) {
      // 如果ID转换成功但用户不存在，严重扣分
      if (diagnosis.session.idConversion?.success) {
        score -= 30;
      } else {
        // ID转换失败，中等扣分
        score -= 20;
      }
    }
    
    if (!diagnosis.session.sessionMatch && diagnosis.session.sessions.count > 0) {
      score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`🩺 [${requestId}] 综合会话诊断API被调用`);

  // 设置响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', CONFIG.ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', `no-cache, no-store, must-revalidate, max-age=${CONFIG.CACHE_DURATION}`);
  
  // 设置安全头
  Object.entries(CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `方法不允许。支持的方法: ${CONFIG.ALLOWED_METHODS.join(', ')}`
    });
  }

  try {
    // 设置诊断超时
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('诊断超时')), CONFIG.DIAGNOSTIC_TIMEOUT)
    );

    const diagnosisPromise = (async () => {
      const startTime = Date.now();

      // 1. 环境检查
      const environment = checkEnvironment();

      // 2. 数据库检查
      const database = await safeDatabaseCheck(prisma);

      // 3. 会话检查
      const session = await getServerSession(req, res, authOptions);
      const sessionAnalysis = await analyzeSession(session, prisma, req);

      // 4. Cookie 分析
      const cookieAnalysis = analyzeCookies(req.headers.cookie);

      // 5. 构建诊断结果
      const diagnosis = {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        status: sessionAnalysis.exists ? 'SESSION_ACTIVE' : 'NO_SESSION',
        summary: {
          environmentHealthy: environment.allRequiredSet,
          databaseHealthy: database.connected,
          sessionHealthy: sessionAnalysis.exists && sessionAnalysis.dbUser?.exists
        },
        environment,
        database,
        session: sessionAnalysis,
        cookies: cookieAnalysis,
        issues: [],
        recommendations: [],
        security: {
          https: req.headers['x-forwarded-proto'] === 'https',
          host: req.headers.host,
          userAgent: req.headers['user-agent']
        }
      };

      // 6. 问题检测和建议
      if (!environment.allRequiredSet) {
        diagnosis.issues.push('❌ 缺少必需的环境变量');
        diagnosis.recommendations.push('🔧 设置缺失的环境变量: ' + environment.missingVars.join(', '));
      }

      if (!database.connected) {
        diagnosis.issues.push('❌ 数据库连接失败');
        diagnosis.recommendations.push('🔧 检查 DATABASE_URL 配置和数据库状态');
      }

      // 🔧 关键修复：更新用户存在性检查逻辑
      if (sessionAnalysis.exists) {
        if (!sessionAnalysis.dbUser?.exists) {
          if (sessionAnalysis.idConversion?.success) {
            diagnosis.issues.push('❌ 会话存在但用户数据库记录不存在（ID转换成功）');
            diagnosis.recommendations.push('🔧 检查用户数据完整性或重新创建用户');
          } else {
            diagnosis.issues.push('❌ 用户ID转换失败');
            diagnosis.recommendations.push('🔧 检查会话中的用户ID格式');
          }
        } else {
          diagnosis.issues.push('✅ 用户数据库记录存在');
        }
        
        // 添加ID转换状态检查
        if (sessionAnalysis.idConversion) {
          if (sessionAnalysis.idConversion.success) {
            diagnosis.issues.push('✅ 用户ID转换成功');
          } else {
            diagnosis.issues.push('❌ 用户ID类型转换失败');
            diagnosis.recommendations.push('🔧 修复认证配置中的ID类型一致性');
          }
        }
      }

      if (sessionAnalysis.exists && !sessionAnalysis.sessionMatch && sessionAnalysis.sessions.count > 0) {
        diagnosis.issues.push('⚠️ 会话不匹配：Cookie 中的会话与数据库不匹配');
        diagnosis.recommendations.push('🔧 可能需要清理浏览器 Cookie 或数据库会话');
      }

      if (cookieAnalysis.authCookies.length === 0 && sessionAnalysis.exists) {
        diagnosis.issues.push('⚠️ 有会话但无认证 Cookie');
        diagnosis.recommendations.push('🔧 检查 Cookie 设置和域名配置');
      }

      // 7. 健康评分
      const healthScore = calculateHealthScore(diagnosis);
      diagnosis.healthScore = healthScore;

      console.log(`✅ [${requestId}] 诊断完成`, {
        healthScore,
        sessionExists: sessionAnalysis.exists,
        dbConnected: database.connected,
        userExists: sessionAnalysis.dbUser?.exists
      });

      return diagnosis;
    })();

    const diagnosis = await Promise.race([diagnosisPromise, timeoutPromise]);

    res.status(200).json(diagnosis);

  } catch (error) {
    console.error(`❌ [${requestId}] 诊断错误:`, error);
    
    res.status(500).json({
      requestId,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      recommendations: [
        '🔧 检查服务器日志获取详细错误信息',
        '🔧 验证数据库连接配置',
        '🔧 检查 NextAuth 配置'
      ]
    });
  } finally {
    // 安全断开数据库连接
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.warn('断开数据库连接失败:', error);
    }
  }
}

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
    externalResolver: true,
  },
};