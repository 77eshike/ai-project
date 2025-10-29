// 独立的会话检查 API
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 从 cookie 获取 token
    const token = req.cookies['auth-token']
    
    if (!token) {
      return res.status(200).json({ authenticated: false, user: null })
    }

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET)
    
    res.status(200).json({
      authenticated: true,
      user: decoded
    })

  } catch (error) {
    console.error('❌ 会话检查错误:', error)
    // token 无效，清除 cookie
    res.setHeader('Set-Cookie', 'auth-token=; Path=/; HttpOnly; Max-Age=0')
    res.status(200).json({ authenticated: false, user: null })
  }
}
