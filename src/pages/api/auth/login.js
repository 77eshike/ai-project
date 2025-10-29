// pages/api/auth/login.js - 优化版本
import bcrypt from 'bcryptjs';
export default async function handler(req, res) {
  console.log('🔐 登录API被调用，方法:', req.method);

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

    const { email, password } = body;

    console.log('📝 登录请求数据:', { 
      email: email?.substring(0, 5) + '***'
    });

    // 验证必需字段
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: '邮箱和密码不能为空',
        code: 'MISSING_CREDENTIALS'
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

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase().trim() 
      },
      include: {
        preferences: true
      }
    });

    if (!user) {
      console.log('❌ 用户不存在:', email);
      return res.status(401).json({ 
        success: false,
        message: '邮箱或密码错误', // 安全考虑，不提示具体是邮箱还是密码错误
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 检查用户状态
    if (user.status !== 'ACTIVE') {
      console.log('⛔ 用户状态异常:', user.status);
      return res.status(403).json({ 
        success: false,
        message: `账户已被${user.status === 'BLOCKED' ? '禁用' : '暂停'}`,
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // 检查密码是否存在
    if (!user.password) {
      console.log('❌ 用户密码未设置:', user.id);
      return res.status(401).json({ 
        success: false,
        message: '账户配置错误，请联系管理员',
        code: 'PASSWORD_NOT_SET'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ 密码错误:', email);
      
      // 记录失败的登录尝试（可选）
      try {
        await prisma.failedLoginAttempt.create({
          data: {
            email: email.toLowerCase().trim(),
            ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
          }
        });
      } catch (auditError) {
        console.warn('⚠️ 失败登录记录失败:', auditError.message);
      }
      
      return res.status(401).json({ 
        success: false,
        message: '邮箱或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date() 
      }
    });

    console.log('✅ 登录成功:', { 
      id: user.id, 
      email: user.email 
    });

    // 记录成功登录事件（可选）
    try {
      await prisma.auditLog.create({
        data: {
          action: 'USER_LOGIN',
          userId: user.id,
          description: `用户登录: ${user.email}`,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (auditError) {
      console.warn('⚠️ 审计日志记录失败:', auditError.message);
    }

    // 准备响应数据
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      status: user.status,
      preferences: user.preferences || {},
      lastLoginAt: user.lastLoginAt
    };

    res.status(200).json({
      success: true,
      message: '登录成功',
      user: userResponse,
      code: 'LOGIN_SUCCESS'
    });

  } catch (error) {
    console.error('❌ 登录过程错误:', error);
    
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