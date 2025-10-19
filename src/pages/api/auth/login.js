// /src/pages/api/auth/login.js
import { authOptions } from '../../../lib/auth'
import { getServerSession } from 'next-auth/next'

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // 确保请求体存在
    if (!req.body) {
      return res.status(400).json({ message: '请求体不能为空' })
    }

    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({ message: '无效的JSON格式' })
    }

    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码不能为空' })
    }

    console.log('🔐 登录尝试:', email)

    // 直接使用Prisma验证用户
    const { prisma } = await import('../../../lib/auth')
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return res.status(401).json({ message: '用户不存在' })
    }

    if (!user.password) {
      return res.status(401).json({ message: '用户密码未设置' })
    }

    // 验证密码
    const bcrypt = await import('bcryptjs')
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ message: '密码错误' })
    }

    // 获取session（这会创建会话）
    const session = await getServerSession(req, res, authOptions)
    
    console.log('✅ 登录成功:', email)

    res.status(200).json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

  } catch (error) {
    console.error('Login API error:', error)
    res.status(500).json({ 
      message: '服务器错误，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}