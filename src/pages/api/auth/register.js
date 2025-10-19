// pages/api/auth/register.js
import bcrypt from 'bcryptjs'
import { prisma } from '../../../lib/auth'

export default async function handler(req, res) {
  console.log('🔵 注册API被调用，方法:', req.method)
  console.log('请求头:', JSON.stringify(req.headers))

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    console.log('❌ 方法不允许:', req.method)
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // 确保请求体存在
    if (!req.body) {
      console.log('❌ 请求体为空')
      return res.status(400).json({ message: '请求体不能为空' })
    }

    // 解析请求体
    let body;
    try {
      // 对于Vercel等 serverless 环境，req.body 可能是字符串
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('📋 解析后的请求体:', body)
    } catch (parseError) {
      console.log('❌ JSON解析错误:', parseError.message)
      return res.status(400).json({ 
        message: '无效的JSON格式',
        error: parseError.message 
      })
    }

    const { email, password, username, name } = body;

    // 兼容性处理：支持 username 或 name 字段
    const finalName = username || name;

    console.log('📋 接收到的字段:', { 
      email, 
      password: password ? '***' : '空', 
      username, 
      name,
      finalName 
    })

    // 验证必需字段
    if (!email) {
      console.log('❌ 邮箱为空')
      return res.status(400).json({ message: '邮箱不能为空' })
    }

    if (!password) {
      console.log('❌ 密码为空')
      return res.status(400).json({ message: '密码不能为空' })
    }

    if (!finalName) {
      console.log('❌ 用户名为空')
      return res.status(400).json({ message: '用户名不能为空' })
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ 邮箱格式错误:', email)
      return res.status(400).json({ message: '请输入有效的邮箱地址' })
    }

    // 密码长度验证
    if (password.length < 6) {
      console.log('❌ 密码太短:', password.length)
      return res.status(400).json({ message: '密码至少需要6位' })
    }

    console.log('🔍 检查用户是否存在:', email)
    
    try {
      // 检查邮箱是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (existingUser) {
        console.log('❌ 用户已存在:', email)
        return res.status(409).json({ message: '该邮箱已被注册' })
      }

      console.log('🔐 加密密码...')
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12)

      console.log('👤 创建用户...')
      // 创建用户
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name: finalName,
          emailVerified: new Date(),
        }
      })

      console.log('✅ 用户创建成功:', user.email)

      res.status(201).json({
        message: '注册成功',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        }
      })

    } catch (dbError) {
      console.error('❌ 数据库错误:', dbError)
      if (dbError.code === 'P2002') {
        return res.status(409).json({ message: '该邮箱已被注册' })
      }
      
      // 处理其他数据库错误
      res.status(500).json({ 
        message: '数据库错误，请稍后重试',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      })
    }

  } catch (error) {
    console.error('❌ Signup error:', error)
    res.status(500).json({ 
      message: '服务器错误，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}