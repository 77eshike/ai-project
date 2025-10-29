// 测试独立认证的页面
import { useState, useEffect } from 'react'

export default function TestAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const res = await fetch('/api/simple-auth/session')
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      console.error('检查会话失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/simple-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@final.com',
          password: 'test123456'
        })
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        alert('登录成功!')
      } else {
        alert('登录失败: ' + data.error)
      }
    } catch (error) {
      console.error('登录失败:', error)
      alert('登录失败')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/simple-auth/logout', { method: 'POST' })
      setUser(null)
      alert('已退出登录')
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  if (loading) return <div>加载中...</div>

  return (
    <div style={{ padding: '20px' }}>
      <h1>独立认证测试</h1>
      
      {user ? (
        <div>
          <p>✅ 已登录</p>
          <p>用户: {user.name} ({user.email})</p>
          <p>角色: {user.role}</p>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      ) : (
        <div>
          <p>❌ 未登录</p>
          <button onClick={handleLogin}>测试登录</button>
        </div>
      )}
    </div>
  )
}
