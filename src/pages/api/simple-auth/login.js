

// 独立的登录 API - 绕过 NextAuth

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' })
    }

    console.log('🔐 独立登录尝试:', email)

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return res.status(401).json({ error: '用户不存在' })
    }

    if (!user.password) {
      return res.status(401).json({ error: '密码未设置' })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: '密码错误' })
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ error: '账户状态异常' })
    }

    // 创建 JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    console.log('✅ 独立登录成功:', user.email)

    // 设置 HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ])

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('❌ 独立登录错误:', error)
    res.status(500).json({ error: '服务器错误' })
  } finally {
    await prisma.$disconnect()
  }
}
