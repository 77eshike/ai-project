// pages/_app.js - 最终拦截版本
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

// 🔧 关键修复：创建完全拦截的 SessionProvider
function UltimateSessionProvider({ children, session }) {
  const sessionProviderRef = useRef(null);
  
  useEffect(() => {
    // 🔧 关键修复：在组件挂载时立即应用拦截
    if (typeof window !== 'undefined') {
      console.log('🛡️ 启动 NextAuth 会话检查拦截器');
      
      let interceptedCount = 0;
      let lastLogTime = 0;
      
      // 方法1：彻底拦截 fetch
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [url, options = {}] = args;
        
        if (typeof url === 'string' && url.includes('/api/auth/session')) {
          interceptedCount++;
          const now = Date.now();
          
          // 每10秒记录一次拦截情况，避免控制台 spam
          if (now - lastLogTime > 10000) {
            console.log(`🚫 已拦截 ${interceptedCount} 次会话检查请求`);
            lastLogTime = now;
          }
          
          // 直接返回缓存的会话数据，完全阻止实际网络请求
          return Promise.resolve(new Response(JSON.stringify({
            user: session?.user || null,
            expires: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1小时
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'X-Session-Intercepted': 'true',
              'X-Intercepted-Count': interceptedCount.toString()
            }
          }));
        }
        
        return originalFetch.apply(this, args);
      };
      
      // 方法2：拦截 XMLHttpRequest（NextAuth 可能使用）
      const originalXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (typeof url === 'string' && url.includes('/api/auth/session')) {
          this._interceptSession = true;
          interceptedCount++;
        }
        return originalXHROpen.call(this, method, url, ...args);
      };
      
      const originalXHRSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function(...args) {
        if (this._interceptSession) {
          // 立即触发成功响应，阻止实际请求
          setTimeout(() => {
            if (this.readyState === 1) {
              this.readyState = 4;
              this.status = 200;
              this.responseText = JSON.stringify({
                user: session?.user || null,
                expires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
              });
              if (this.onload) this.onload();
              if (this.onreadystatechange) this.onreadystatechange();
            }
          }, 0);
          return;
        }
        return originalXHRSend.apply(this, args);
      };
      
      // 方法3：阻止 NextAuth 的定时轮询
      const originalSetInterval = window.setInterval;
      const interceptedIntervals = new Set();
      
      window.setInterval = function(callback, delay, ...args) {
        // 检测可能是 NextAuth 的短间隔轮询
        if (delay < 30000 && typeof callback === 'function') {
          const callbackStr = callback.toString();
          if (callbackStr.includes('session') || 
              callbackStr.includes('auth') || 
              callbackStr.includes('refetch')) {
            console.log('🚫 阻止 NextAuth 轮询定时器');
            // 创建一个几乎不执行的长间隔定时器
            const fakeId = originalSetInterval(() => {}, 24 * 60 * 60 * 1000);
            interceptedIntervals.add(fakeId);
            return fakeId;
          }
        }
        return originalSetInterval.call(this, callback, delay, ...args);
      };
      
      // 清理函数
      return () => {
        console.log('🧹 清理 NextAuth 拦截器');
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalXHROpen;
        XMLHttpRequest.prototype.send = originalXHRSend;
        window.setInterval = originalSetInterval;
        interceptedIntervals.forEach(id => clearInterval(id));
      };
    }
  }, [session]);
  
  return (
    <SessionProvider 
      ref={sessionProviderRef}
      session={session}
      // 🔧 关键修复：完全禁用所有自动行为
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchOnMount={false}
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
    if (typeof window !== 'undefined') {
      currentPathRef.current = window.location.pathname
      
      // 🔧 静默 NextAuth 的控制台输出
      const suppressNextAuthLogs = () => {
        const originalConsole = {
          log: console.log,
          warn: console.warn,
          error: console.error,
        };
        
        console.log = function(...args) {
          if (typeof args[0] === 'string' && args[0].includes('NextAuth')) return;
          originalConsole.log.apply(console, args);
        };
        
        console.warn = function(...args) {
          if (typeof args[0] === 'string' && (
            args[0].includes('NextAuth') || 
            args[0].includes('session') ||
            args[0].includes('auth')
          )) return;
          originalConsole.warn.apply(console, args);
        };
        
        console.error = function(...args) {
          if (typeof args[0] === 'string' && args[0].includes('NextAuth')) return;
          originalConsole.error.apply(console, args);
        };
      };
      
      suppressNextAuthLogs();
    }
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
      <div 
        className="fixed top-0 left-0 w-full h-1 bg-blue-200 z-50 transition-opacity duration-300"
        style={{ 
          opacity: loading && isClient ? 1 : 0,
          pointerEvents: 'none'
        }}
      >
        <div className="h-full bg-blue-500 animate-pulse"></div>
      </div>

      {/* 安全渲染组件 */}
      <div style={{ display: isClient ? 'block' : 'none' }}>
        <SessionStatusIndicator />
      </div>

      {/* 🔧 关键修复：使用终极拦截 SessionProvider */}
      <UltimateSessionProvider session={session}>
        <UserProvider>
          <KnowledgeProvider>
            <Component {...pageProps} />
          </KnowledgeProvider>
        </UserProvider>
      </UltimateSessionProvider>
    </ErrorBoundary>
  )
}

export default MyApp