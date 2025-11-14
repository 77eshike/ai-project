// pages/api/auth/login.js - 终极优化版本
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../lib/prisma';

// 🔧 配置常量
const CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15分钟
  PASSWORD_MIN_LENGTH: 6,
  SESSION_DURATION: 30 * 24 * 60 * 60 * 1000, // 30天
  RATE_LIMIT_WINDOW: 60 * 1000, // 1分钟
  RATE_LIMIT_MAX: 10 // 每分钟最大尝试次数
};

// 🔧 内存缓存用于限流
const loginAttempts = new Map();

// 🔧 工具函数：检查登录限流
function checkRateLimit(identifier) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
  
  // 清理过期记录
  for (const [key, attempts] of loginAttempts.entries()) {
    const validAttempts = attempts.filter(time => time > windowStart);
    if (validAttempts.length === 0) {
      loginAttempts.delete(key);
    } else {
      loginAttempts.set(key, validAttempts);
    }
  }
  
  // 检查当前请求
  const userAttempts = loginAttempts.get(identifier) || [];
  const recentAttempts = userAttempts.filter(time => time > windowStart);
  
  if (recentAttempts.length >= CONFIG.RATE_LIMIT_MAX) {
    return false;
  }
  
  recentAttempts.push(now);
  loginAttempts.set(identifier, recentAttempts);
  return true;
}

// 🔧 工具函数：检查账户锁定状态
async function checkAccountLock(email) {
  try {
    // 检查最近的失败登录尝试
    const recentFailures = await prisma.failedLoginAttempt.count({
      where: {
        email: email.toLowerCase().trim(),
        createdAt: {
          gte: new Date(Date.now() - CONFIG.LOCKOUT_DURATION)
        }
      }
    });
    
    return recentFailures >= CONFIG.MAX_LOGIN_ATTEMPTS;
  } catch (error) {
    console.warn('检查账户锁定状态失败:', error);
    return false;
  }
}

// 🔧 工具函数：记录安全事件
async function logSecurityEvent(action, userId, email, req, additionalData = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        description: `${action}: ${email}`,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: additionalData
      }
    });
  } catch (error) {
    console.warn('安全事件记录失败:', error);
  }
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log(`🔐 [${requestId}] 登录API被调用`, {
    method: req.method,
    clientIP: clientIP,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });

  // 设置安全头
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: '方法不允许',
      code: 'METHOD_NOT_ALLOWED',
      requestId
    });
  }

  // 检查限流
  const identifier = clientIP || 'unknown';
  if (!checkRateLimit(identifier)) {
    console.warn(`🚫 [${requestId}] 请求频率过高:`, identifier);
    await logSecurityEvent('RATE_LIMIT_EXCEEDED', null, identifier, req);
    
    return res.status(429).json({ 
      success: false,
      message: '请求过于频繁，请稍后重试',
      code: 'RATE_LIMIT_EXCEEDED',
      requestId
    });
  }

  try {
    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON解析错误:`, parseError);
      return res.status(400).json({ 
        success: false,
        message: '无效的请求格式',
        code: 'INVALID_JSON',
        requestId
      });
    }

    const { email, password, preventRedirect, deviceInfo } = body;

    console.log(`📝 [${requestId}] 登录请求数据:`, { 
      email: email?.substring(0, 5) + '***',
      preventRedirect: !!preventRedirect,
      hasDeviceInfo: !!deviceInfo
    });

    // 验证必需字段
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: '邮箱和密码不能为空',
        code: 'MISSING_CREDENTIALS',
        requestId
      });
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: '请输入有效的邮箱地址',
        code: 'INVALID_EMAIL',
        requestId
      });
    }

    // 密码长度验证
    if (password.length < CONFIG.PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ 
        success: false,
        message: `密码长度不能少于${CONFIG.PASSWORD_MIN_LENGTH}位`,
        code: 'PASSWORD_TOO_SHORT',
        requestId
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 检查账户是否被锁定
    const isAccountLocked = await checkAccountLock(normalizedEmail);
    if (isAccountLocked) {
      console.warn(`⛔ [${requestId}] 账户被锁定:`, normalizedEmail);
      await logSecurityEvent('ACCOUNT_LOCKED_ATTEMPT', null, normalizedEmail, req);
      
      return res.status(423).json({ 
        success: false,
        message: '账户因多次失败尝试已被暂时锁定，请15分钟后再试',
        code: 'ACCOUNT_LOCKED',
        requestId
      });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { 
        email: normalizedEmail 
      },
      include: {
        preferences: true,
        securitySettings: true
      }
    });

    if (!user) {
      console.log(`❌ [${requestId}] 用户不存在:`, normalizedEmail);
      await logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', null, normalizedEmail, req);
      
      // 记录失败尝试
      await prisma.failedLoginAttempt.create({
        data: {
          email: normalizedEmail,
          ipAddress: clientIP,
          userAgent: req.headers['user-agent'],
          reason: 'USER_NOT_FOUND'
        }
      });
      
      return res.status(401).json({ 
        success: false,
        message: '邮箱或密码错误',
        code: 'INVALID_CREDENTIALS',
        requestId
      });
    }

    // 检查用户状态
    if (user.status !== 'ACTIVE') {
      console.log(`⛔ [${requestId}] 用户状态异常:`, user.status);
      await logSecurityEvent('LOGIN_FAILED_ACCOUNT_STATUS', user.id, normalizedEmail, req, { status: user.status });
      
      const statusMessages = {
        'INACTIVE': '账户未激活，请检查邮箱验证',
        'SUSPENDED': '账户已被暂停使用',
        'BLOCKED': '账户已被禁用',
        'DELETED': '账户不存在'
      };
      
      return res.status(403).json({ 
        success: false,
        message: statusMessages[user.status] || '账户状态异常',
        code: 'ACCOUNT_' + user.status,
        requestId
      });
    }

    // 检查密码是否存在
    if (!user.password) {
      console.log(`❌ [${requestId}] 用户密码未设置:`, user.id);
      await logSecurityEvent('LOGIN_FAILED_NO_PASSWORD', user.id, normalizedEmail, req);
      
      return res.status(401).json({ 
        success: false,
        message: '账户配置错误，请联系管理员',
        code: 'PASSWORD_NOT_SET',
        requestId
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`❌ [${requestId}] 密码错误:`, normalizedEmail);
      
      await logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', user.id, normalizedEmail, req);
      
      // 记录失败的登录尝试
      await prisma.failedLoginAttempt.create({
        data: {
          email: normalizedEmail,
          ipAddress: clientIP,
          userAgent: req.headers['user-agent'],
          userId: user.id,
          reason: 'INVALID_PASSWORD'
        }
      });
      
      return res.status(401).json({ 
        success: false,
        message: '邮箱或密码错误',
        code: 'INVALID_CREDENTIALS',
        requestId
      });
    }

    // 🔧 关键修复：清除失败登录记录（登录成功）
    try {
      await prisma.failedLoginAttempt.deleteMany({
        where: {
          email: normalizedEmail,
          createdAt: {
            gte: new Date(Date.now() - CONFIG.LOCKOUT_DURATION)
          }
        }
      });
    } catch (cleanupError) {
      console.warn(`⚠️ [${requestId}] 清理失败记录失败:`, cleanupError.message);
    }

    // 更新最后登录时间和设备信息
    const updateData = { 
      lastLoginAt: new Date(),
      updatedAt: new Date()
    };

    // 如果有设备信息，更新设备记录
    if (deviceInfo) {
      updateData.lastDeviceInfo = deviceInfo;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    console.log(`✅ [${requestId}] 登录成功:`, { 
      id: user.id, 
      email: user.email 
    });

    // 记录成功登录事件
    await logSecurityEvent('USER_LOGIN_SUCCESS', user.id, normalizedEmail, req, {
      deviceInfo,
      sessionDuration: CONFIG.SESSION_DURATION
    });

    // 🔧 关键修复：清除任何可能的登出状态标记
    const clearLogoutCookies = [
      'post-logout=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax',
      'logout_complete=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax',
      'auth_error=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    ];

    // 准备响应数据
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      status: user.status,
      preferences: user.preferences || {},
      securitySettings: user.securitySettings || {},
      lastLoginAt: user.lastLoginAt,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    };

    // 🔧 关键修复：设置响应头，防止登出状态干扰
    res.setHeader('X-Login-Status', 'authenticated');
    res.setHeader('X-User-ID', user.id);
    res.setHeader('X-Session-Duration', CONFIG.SESSION_DURATION);
    
    // 只有在需要时才设置清除Cookie的头部
    if (req.headers.cookie?.match(/(post-logout|logout_complete|auth_error)/)) {
      res.setHeader('Set-Cookie', clearLogoutCookies);
    }

    const responseData = {
      success: true,
      message: '登录成功',
      user: userResponse,
      redirectTo: preventRedirect ? null : '/dashboard',
      code: 'LOGIN_SUCCESS',
      timestamp: Date.now(),
      requestId,
      session: {
        duration: CONFIG.SESSION_DURATION,
        maxAge: CONFIG.SESSION_DURATION
      }
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] 登录过程错误:`, error);
    
    await logSecurityEvent('LOGIN_ERROR', null, 'unknown', req, {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      success: false,
      message: '服务器错误，请稍后重试',
      code: 'INTERNAL_SERVER_ERROR',
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        debug: error.message
      })
    });
  }
}

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb', // 限制请求体大小
    },
    responseLimit: '10mb',
  },
};