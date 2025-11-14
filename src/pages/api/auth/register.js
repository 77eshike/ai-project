// /src/pages/api/auth/register.js - 完整修复版本
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../lib/prisma';

// 🔧 配置常量
const CONFIG = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 255,
  BCRYPT_ROUNDS: 12,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15分钟
  RATE_LIMIT_MAX_REGISTRATIONS: 3
};

// 🔧 内存缓存用于注册限流
const registrationAttempts = new Map();

// 🔧 工具函数：检查注册限流
function checkRegistrationLimit(identifier) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
  
  // 清理过期记录
  for (const [key, attempts] of registrationAttempts.entries()) {
    const validAttempts = attempts.filter(time => time > windowStart);
    if (validAttempts.length === 0) {
      registrationAttempts.delete(key);
    } else {
      registrationAttempts.set(key, validAttempts);
    }
  }
  
  // 检查当前请求
  const ipAttempts = registrationAttempts.get(identifier) || [];
  const recentAttempts = ipAttempts.filter(time => time > windowStart);
  
  if (recentAttempts.length >= CONFIG.RATE_LIMIT_MAX_REGISTRATIONS) {
    return false;
  }
  
  recentAttempts.push(now);
  registrationAttempts.set(identifier, recentAttempts);
  return true;
}

// 🔧 工具函数：密码强度验证
function validatePasswordStrength(password) {
  const issues = [];
  
  if (password.length < CONFIG.PASSWORD_MIN_LENGTH) {
    issues.push(`密码至少需要${CONFIG.PASSWORD_MIN_LENGTH}位`);
  }
  
  if (password.length > CONFIG.PASSWORD_MAX_LENGTH) {
    issues.push(`密码不能超过${CONFIG.PASSWORD_MAX_LENGTH}位`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    score: calculatePasswordScore(password)
  };
}

// 🔧 工具函数：计算密码强度分数
function calculatePasswordScore(password) {
  let score = 0;
  
  // 长度得分
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  
  // 字符类型得分
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;
  
  return Math.min(100, score);
}

// 🔧 工具函数：用户名验证
function validateUsername(username) {
  const issues = [];
  
  if (username.length < CONFIG.USERNAME_MIN_LENGTH) {
    issues.push(`用户名至少需要${CONFIG.USERNAME_MIN_LENGTH}个字符`);
  }
  
  if (username.length > CONFIG.USERNAME_MAX_LENGTH) {
    issues.push(`用户名不能超过${CONFIG.USERNAME_MAX_LENGTH}个字符`);
  }
  
  // 检查用户名格式（只允许字母、数字、下划线、中文）
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/.test(username)) {
    issues.push('用户名只能包含中文、字母、数字、下划线和连字符');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// 🔧 工具函数：邮箱验证
function validateEmail(email) {
  const issues = [];
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    issues.push('请输入有效的邮箱地址');
  }
  
  if (email.length > CONFIG.EMAIL_MAX_LENGTH) {
    issues.push('邮箱地址过长');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log(`🔵 [${requestId}] 注册API被调用`, {
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

  // 检查注册限流
  const identifier = clientIP || 'unknown';
  if (!checkRegistrationLimit(identifier)) {
    console.warn(`🚫 [${requestId}] 注册频率过高:`, identifier);
    
    return res.status(429).json({ 
      success: false,
      message: `注册过于频繁，请${CONFIG.RATE_LIMIT_WINDOW / 60000}分钟后再试`,
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

    const { email, password, username, name, acceptTerms } = body;
    const finalName = username || name;

    console.log(`📝 [${requestId}] 注册请求数据:`, { 
      email: email?.substring(0, 5) + '***',
      hasPassword: !!password,
      name: finalName?.substring(0, 3) + '***',
      acceptTerms: !!acceptTerms
    });

    // 验证必需字段
    const missingFields = [];
    if (!email) missingFields.push('邮箱');
    if (!password) missingFields.push('密码');
    if (!finalName) missingFields.push('用户名');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `${missingFields.join('、')}不能为空`,
        code: 'MISSING_FIELDS',
        requestId
      });
    }

    // 验证服务条款接受
    if (acceptTerms !== true) {
      return res.status(400).json({ 
        success: false,
        message: '请接受服务条款和隐私政策',
        code: 'TERMS_NOT_ACCEPTED',
        requestId
      });
    }

    // 验证邮箱
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ 
        success: false,
        message: emailValidation.issues[0],
        code: 'INVALID_EMAIL',
        details: emailValidation.issues,
        requestId
      });
    }

    // 验证密码强度
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false,
        message: passwordValidation.issues[0],
        code: 'WEAK_PASSWORD',
        details: passwordValidation.issues,
        requestId
      });
    }

    // 验证用户名
    const usernameValidation = validateUsername(finalName);
    if (!usernameValidation.valid) {
      return res.status(400).json({ 
        success: false,
        message: usernameValidation.issues[0],
        code: 'INVALID_USERNAME',
        details: usernameValidation.issues,
        requestId
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = finalName.trim();

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      console.log(`❌ [${requestId}] 邮箱已存在:`, normalizedEmail);
      return res.status(409).json({ 
        success: false,
        message: '该邮箱已被注册',
        code: 'EMAIL_EXISTS',
        requestId
      });
    }

    // 检查用户名是否已存在
    try {
      const existingUsername = await prisma.user.findFirst({
        where: { 
          name: { 
            equals: normalizedName,
            mode: 'insensitive'
          } 
        }
      });

      if (existingUsername) {
        console.log(`❌ [${requestId}] 用户名已存在:`, normalizedName);
        return res.status(409).json({ 
          success: false,
          message: '该用户名已被使用',
          code: 'USERNAME_EXISTS',
          requestId
        });
      }
    } catch (usernameError) {
      console.warn(`⚠️ [${requestId}] 用户名检查失败:`, usernameError.message);
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);

    // 🔧 关键修复：创建用户数据（使用正确的枚举值）
    const userData = {
      email: normalizedEmail,
      password: hashedPassword,
      name: normalizedName,
      emailVerified: new Date(),
      status: "ACTIVE", // 🔧 修复：使用字符串 "ACTIVE" 而不是布尔值 true
      role: "USER",
      image: null,
      lastLoginAt: new Date()
    };

    console.log(`📦 [${requestId}] 准备创建用户数据:`, userData);

    // 创建用户
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });

    console.log(`✅ [${requestId}] 用户创建成功:`, { 
      id: user.id, 
      email: user.email,
      status: user.status
    });

    // 🔧 修复：返回用户信息但不创建会话
    const responseData = {
      success: true,
      message: '注册成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        role: user.role,
        status: user.status
      },
      // 🔧 关键修复：明确告诉客户端需要自动登录
      autoLoginRequired: true,
      code: 'REGISTRATION_SUCCESS',
      requestId,
      timestamp: new Date().toISOString()
    };

    return res.status(201).json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] 注册过程错误:`, error);

    // 处理 Prisma 错误
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      const fieldMap = {
        'email': '邮箱',
        'name': '用户名'
      };
      
      return res.status(409).json({ 
        success: false,
        message: `该${fieldMap[field] || '信息'}已被使用`,
        code: `${field.toUpperCase()}_EXISTS`,
        requestId
      });
    }

    // 🔧 关键修复：提供更详细的错误信息
    let errorMessage = '服务器错误，请稍后重试';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    
    if (error.message.includes('status') || error.message.includes('ACTIVE')) {
      errorMessage = '用户状态设置错误';
      errorCode = 'INVALID_STATUS';
    } else if (error.message.includes('role')) {
      errorMessage = '用户角色设置错误';
      errorCode = 'INVALID_ROLE';
    }

    return res.status(500).json({ 
      success: false,
      message: errorMessage,
      code: errorCode,
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          message: error.message,
          code: error.code,
          meta: error.meta
        }
      })
    });
  }
}

// 🔧 API 配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb',
    },
    responseLimit: '10mb',
  },
};