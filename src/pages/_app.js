// pages/_app.js - 优化版本
import '../../src/styles/globals.css';
import '../../src/styles/ChatInterface.css';
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback, useRef } from 'react'
import { SessionProvider } from 'next-auth/react'
import { UserProvider } from '../contexts/UserContext'
import { KnowledgeProvider } from '../contexts/KnowledgeContext'
import ErrorBoundary from '../components/ErrorBoundary'
import Head from 'next/head'

// 检查组件是否存在
let SessionStatusIndicator;
try {
  SessionStatusIndicator = require('../components/SessionStatusIndicator').default;
} catch (error) {
  SessionStatusIndicator = () => null;
}

// 优化的 SessionProvider 包装器
function OptimizedSessionProvider({ children, session }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    
    // 温和的会话管理优化
    const optimizeSessionManagement = () => {
      // 只在开发环境显示相关日志
      if (process.env.NODE_ENV === 'development') {
        const originalConsole = {
          log: console.log,
          warn: console.warn,
        };
        
        // 过滤 NextAuth 的调试日志（可选）
        console.log = function(...args) {
          if (typeof args[0] === 'string' && args[0].includes('[next-auth][debug]')) {
            return;
          }
          originalConsole.log.apply(console, args);
        };
      }
    };
    
    optimizeSessionManagement();
  }, []);
  
  return (
    <SessionProvider 
      session={session}
      // 优化配置：减少不必要的重获取
      refetchInterval={isMounted ? 60 * 60 : 0} // 1小时检查一次
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      // 只在挂载时获取，避免重复请求
      refetchOnMount={isMounted}
    >
      {children}
    </SessionProvider>
  );
}

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const currentPathRef = useRef('')

  // 安全的客户端检测
  useEffect(() => {
    setIsClient(true)
    currentPathRef.current = window.location.pathname
  }, [])

  // 路由事件处理
  const handleStart = useCallback(() => {
    if (!isClient) return
    setLoading(true)
  }, [isClient])

  const handleComplete = useCallback((url) => {
    if (!isClient) return
    setLoading(false)
    if (url) {
      currentPathRef.current = url
    }
  }, [isClient])

  // 路由事件监听
  useEffect(() => {
    if (!isClient || !router?.events) return

    const events = [
      ['routeChangeStart', handleStart],
      ['routeChangeComplete', handleComplete],
      ['routeChangeError', handleComplete]
    ]

    events.forEach(([event, handler]) => {
      router.events.on(event, handler)
    })

    return () => {
      events.forEach(([event, handler]) => {
        router.events.off(event, handler)
      })
    }
  }, [router?.events, handleStart, handleComplete, isClient])

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>191413AI平台</title>
        <meta name="description" content="智能AI助手平台，提供聊天、知识管理与语音交互功能" />
      </Head>

      {/* 加载指示器 */}
      {isClient && (
        <div 
          className="fixed top-0 left-0 w-full h-1 bg-blue-200 z-50 transition-opacity duration-300"
          style={{ 
            opacity: loading ? 1 : 0,
            pointerEvents: 'none'
          }}
        >
          <div className="h-full bg-blue-500 animate-pulse"></div>
        </div>
      )}

      {/* 安全渲染组件 */}
      {isClient && <SessionStatusIndicator />}

      {/* 使用优化的 SessionProvider */}
      <OptimizedSessionProvider session={session}>
        <UserProvider>
          <KnowledgeProvider>
            <Component {...pageProps} />
          </KnowledgeProvider>
        </UserProvider>
      </OptimizedSessionProvider>
    </ErrorBoundary>
  )
}

export default MyApp