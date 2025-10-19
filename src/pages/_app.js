// pages/_app.js - 修复水合错误版本
import '../styles/globals.css'
import '../styles/ChatInterface.css'
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import SessionProvider from '../components/SessionProvider'
import { UserProvider } from '../contexts/UserContext'
import { KnowledgeProvider } from '../contexts/KnowledgeContext'
import ErrorBoundary from '../components/ErrorBoundary'
import Head from 'next/head'
import SessionStatusIndicator from '../components/SessionStatusIndicator'

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // 修复水合错误：只在客户端设置状态和执行副作用
  useEffect(() => {
    setIsClient(true)

    // 防止 React 触摸事件被动化冲突（语音按钮关键）
    document.addEventListener('touchstart', () => {}, { passive: false })

    const checkMobile = () => {
      // 确保只在客户端执行
      if (typeof window === 'undefined') return
      const ua = navigator.userAgent
      const isMobile = /iPhone|iPad|iPod|Android/i.test(ua) || window.innerWidth < 768
      document.body.dataset.device = isMobile ? 'mobile' : 'desktop'
    }

    // 只在客户端执行
    if (typeof window !== 'undefined') {
      checkMobile()
      window.addEventListener('resize', checkMobile)
      
      return () => {
        window.removeEventListener('resize', checkMobile)
      }
    }
  }, [])

  // 修复：只在客户端添加事件监听器
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleSessionExpired = () => console.warn('🔐 会话已过期')
    window.addEventListener('auth:session-expired', handleSessionExpired)
    
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired)
    }
  }, [])

  const handleStart = useCallback(() => {
    // 只在客户端设置加载状态
    if (typeof window !== 'undefined') {
      setLoading(true)
    }
  }, [])

  const handleComplete = useCallback(() => {
    // 只在客户端执行完成操作
    if (typeof window !== 'undefined') {
      setLoading(false)
      window.scrollTo(0, 0)
      
      // FontAwesome 图标渲染 - 只在客户端执行
      if (window.FontAwesome) {
        setTimeout(() => {
          try { 
            window.FontAwesome.dom.i2svg() 
          } catch (error) {
            console.warn('FontAwesome 图标渲染失败:', error)
          }
        }, 100)
      }
    }
  }, [])

  // 路由事件监听 - 修复水合问题
  useEffect(() => {
    // 确保只在客户端添加路由监听器
    if (typeof window === 'undefined') return

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)
    
    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router, handleStart, handleComplete])

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>191413AI平台</title>
        <meta name="description" content="智能AI助手平台，提供聊天、知识管理与语音交互功能" />
      </Head>

      {/* 修复：只在客户端显示加载条 */}
      {isClient && loading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-200 z-50">
          <div className="h-full bg-blue-500 animate-pulse"></div>
        </div>
      )}

      {/* 修复：只在客户端显示会话状态指示器 */}
      {isClient && <SessionStatusIndicator />}

      <SessionProvider session={pageProps.session}>
        <UserProvider>
          <KnowledgeProvider>
            <Component {...pageProps} />
          </KnowledgeProvider>
        </UserProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}

export default MyApp