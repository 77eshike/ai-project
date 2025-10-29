// 独立的登出 API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 清除 cookie
  res.setHeader('Set-Cookie', 'auth-token=; Path=/; HttpOnly; Max-Age=0')
  
  res.status(200).json({ success: true, message: '已退出登录' })
}
