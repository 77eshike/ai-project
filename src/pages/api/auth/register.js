// pages/api/auth/register.js - 修复版本
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/auth';

export default async function handler(req, res) {
  console.log('🔵 注册API被调用，方法:', req.method);

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ 方法不允许:', req.method);
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // 确保请求体存在
    if (!req.body) {
      console.log('❌ 请求体为空');
      return res.status(400).json({ 
        success: false,
        message: '请求体不能为空' 
      });
    }

    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('📋 解析后的请求体:', { 
        email: body.email,
        hasPassword: !!body.password,
        username: body.username,
        name: body.name
      });
    } catch (parseError) {
      console.log('❌ JSON解析错误:', parseError.message);
      return res.status(400).json({ 
        success: false,
        message: '无效的JSON格式',
        error: parseError.message 
      });
    }

    const { email, password, username, name } = body;

    // 兼容性处理：支持 username 或 name 字段
    const finalName = username || name;

    console.log('📋 接收到的字段:', { 
      email, 
      passwordLength: password ? password.length : 0, 
      finalName 
    });

    // 验证必需字段
    if (!email) {
      console.log('❌ 邮箱为空');
      return res.status(400).json({ 
        success: false,
        message: '邮箱不能为空' 
      });
    }

    if (!password) {
      console.log('❌ 密码为空');
      return res.status(400).json({ 
        success: false,
        message: '密码不能为空' 
      });
    }

    if (!finalName) {
      console.log('❌ 用户名为空');
      return res.status(400).json({ 
        success: false,
        message: '用户名不能为空' 
      });
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ 邮箱格式错误:', email);
      return res.status(400).json({ 
        success: false,
        message: '请输入有效的邮箱地址' 
      });
    }

    // 密码长度验证
    if (password.length < 6) {
      console.log('❌ 密码太短:', password.length);
      return res.status(400).json({ 
        success: false,
        message: '密码至少需要6位' 
      });
    }

    console.log('🔍 检查用户是否存在:', email);
    
    try {
      // 检查邮箱是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        console.log('❌ 用户已存在:', email);
        return res.status(409).json({ 
          success: false,
          message: '该邮箱已被注册' 
        });
      }

      console.log('🔐 加密密码...');
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12);

      console.log('👤 创建用户...');
      
      // 根据 Prisma 模型准备用户数据
      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: finalName,
        emailVerified: new Date(),
        // status 是 Boolean 类型，使用 true
        status: true,
        // role 是 String 类型，设置默认值
        role: 'USER',
        // image 可以为 null
        image: null
      };

      console.log('📝 用户数据:', userData);

      // 创建用户
      const user = await prisma.user.create({
        data: userData,
        // 选择返回的字段，避免返回密码
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('✅ 用户创建成功:', { 
        id: user.id, 
        email: user.email,
        name: user.name 
      });

      // 创建用户偏好设置
      try {
        await prisma.userPreference.create({
          data: {
            userId: user.id,
            voiceEnabled: true,
            voicePackage: 'friendly',
            chatStyle: 'casual'
          }
        });
        console.log('✅ 用户偏好设置创建成功');
      } catch (preferenceError) {
        console.warn('⚠️ 用户偏好设置创建失败:', preferenceError.message);
        // 不影响主要注册流程
      }

      res.status(201).json({
        success: true,
        message: '注册成功',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        }
      });

    } catch (dbError) {
      console.error('❌ 数据库错误:', dbError);
      
      // 处理 Prisma 错误
      if (dbError.code === 'P2002') {
        return res.status(409).json({ 
          success: false,
          message: '该邮箱已被注册' 
        });
      }
      
      // 处理字段验证错误
      if (dbError.message.includes('Invalid value provided')) {
        console.error('❌ 字段类型错误:', dbError.message);
        return res.status(400).json({ 
          success: false,
          message: '数据格式错误，请检查输入字段',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
      // 处理其他数据库错误
      res.status(500).json({ 
        success: false,
        message: '数据库错误，请稍后重试',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

  } catch (error) {
    console.error('❌ 注册过程未知错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器错误，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}