// pages/api/auth/register.js - 优化版本
import bcrypt from 'bcryptjs';
export default async function handler(req, res) {
  console.log('🔵 注册API被调用，方法:', req.method);

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error('❌ JSON解析错误:', parseError);
      return res.status(400).json({ 
        success: false,
        message: '无效的请求格式',
        code: 'INVALID_JSON'
      });
    }

    const { email, password, username, name } = body;
    const finalName = username || name;

    console.log('📝 注册请求数据:', { 
      email: email?.substring(0, 5) + '***', // 保护隐私
      hasPassword: !!password,
      name: finalName?.substring(0, 3) + '***'
    });

    // 验证必需字段
    if (!email || !password || !finalName) {
      return res.status(400).json({ 
        success: false,
        message: '邮箱、密码和用户名不能为空',
        code: 'MISSING_FIELDS'
      });
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: '请输入有效的邮箱地址',
        code: 'INVALID_EMAIL'
      });
    }

    // 密码强度验证
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: '密码至少需要6位',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({ 
        success: false,
        message: '密码过长',
        code: 'PASSWORD_TOO_LONG'
      });
    }

    // 用户名验证
    if (finalName.length < 2) {
      return res.status(400).json({ 
        success: false,
        message: '用户名至少需要2个字符',
        code: 'USERNAME_TOO_SHORT'
      });
    }

    if (finalName.length > 50) {
      return res.status(400).json({ 
        success: false,
        message: '用户名过长',
        code: 'USERNAME_TOO_LONG'
      });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      console.log('❌ 邮箱已存在:', email);
      return res.status(409).json({ 
        success: false,
        message: '该邮箱已被注册',
        code: 'EMAIL_EXISTS'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户数据
    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: finalName.trim(),
      emailVerified: new Date(),
      status: "ACTIVE",
      role: "USER",
      image: null,
      lastLoginAt: new Date()
    };

    console.log('📦 准备创建用户数据');

    // 使用事务创建用户和相关记录
    const result = await prisma.$transaction(async (tx) => {
      // 创建用户
      const user = await tx.user.create({
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

      // 创建用户偏好设置
      try {
        await tx.userPreference.create({
          data: {
            userId: user.id,
            voiceEnabled: true,
            voicePackage: 'friendly',
            chatStyle: 'casual',
            notifications: true,
            language: 'zh-CN',
            theme: 'light'
          }
        });
        console.log('✅ 用户偏好设置创建成功');
      } catch (preferenceError) {
        console.warn('⚠️ 用户偏好设置创建失败:', preferenceError.message);
        // 继续执行，不影响用户创建
      }

      return user;
    });

    console.log('✅ 用户创建成功:', { 
      id: result.id, 
      email: result.email 
    });

    // 记录注册事件（可选）
    try {
      await prisma.auditLog.create({
        data: {
          action: 'USER_REGISTER',
          userId: result.id,
          description: `用户注册: ${result.email}`,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (auditError) {
      console.warn('⚠️ 审计日志记录失败:', auditError.message);
    }

    return res.status(201).json({
      success: true,
      message: '注册成功',
      user: result,
      code: 'REGISTRATION_SUCCESS'
    });

  } catch (error) {
    console.error('❌ 注册过程错误:', error);

    // 处理 Prisma 错误
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        success: false,
        message: '该邮箱已被注册',
        code: 'EMAIL_EXISTS'
      });
    }

    if (error.code === 'P2025') {
      return res.status(400).json({ 
        success: false,
        message: '数据库操作失败',
        code: 'DATABASE_ERROR'
      });
    }

    return res.status(500).json({ 
      success: false,
      message: '服务器错误，请稍后重试',
      code: 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        debug: error.message
      })
    });
  }
}