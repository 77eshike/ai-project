// hooks/useSession.js
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { signIn, signOut, getSession } from 'next-auth/react'

// 会话检查间隔（毫秒）
const SESSION_CHECK_INTERVAL = 30000 // 30秒

export const useSession = () => {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  // 获取会话信息
  const fetchSession = useCallback(async () => {
    try {
      const sessionData = await getSession()
      setSession(sessionData)
      setIsLoading(false)
      return sessionData
    } catch (err) {
      console.error('获取会话失败:', err)
      setError('获取会话信息失败')
      setIsLoading(false)
      return null
    }
  }, [])

  // 初始加载会话
  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // 定期检查会话（仅在需要时）
  useEffect(() => {
    if (!session) return
    
    const interval = setInterval(() => {
      fetchSession()
    }, SESSION_CHECK_INTERVAL)
    
    return () => clearInterval(interval)
  }, [session, fetchSession])

  const login = async (email, password) => {
    setIsLoading(true)
    setError('')
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // 解析错误信息
        let errorMessage = '登录失败，请重试'
        if (result.error.includes('邮箱和密码不能为空')) {
          errorMessage = '请填写邮箱和密码'
        } else if (result.error.includes('用户不存在')) {
          errorMessage = '用户不存在'
        } else if (result.error.includes('密码错误')) {
          errorMessage = '密码错误'
        } else if (result.error.includes('用户密码未设置')) {
          errorMessage = '该账号未设置密码'
        }
        
        setError(errorMessage)
        return false
      }

      if (result?.ok) {
        // 等待会话更新
        await fetchSession()
        router.push('/')
        return true
      }
    } catch (error) {
      setError('登录失败，请重试')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email, password, name) => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (response.ok) {
        // 注册成功后自动登录
        const loginSuccess = await login(email, password)
        return loginSuccess
      } else {
        setError(data.message || '注册失败')
        return false
      }
    } catch (error) {
      setError('注册失败，请重试')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut({ redirect: false })
      setSession(null)
      router.push('/auth/signin')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return { 
    session,
    isLoading, 
    error,
    login, 
    register, 
    logout, 
    clearError: () => setError(''),
    refreshSession: fetchSession
  }
}