// src/pages/_app.js - 完整修复版本
import '../styles/globals.css';
import '../styles/ChatInterface.css';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { UserProvider } from '../contexts/UserContext';
import { KnowledgeProvider } from '../contexts/KnowledgeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

// 会话健康监控组件
function SessionMonitor({ children }) {
  const { data: session, status, update } = useSession();
  const [lastCheck, setLastCheck] = useState(0);
  const [checkCount, setCheckCount] = useState(0);
  const router = useRouter();

  // 🔧 优化的会话健康检查 - 大幅减少频率
  const checkSessionHealth = useCallback(async () => {
    const now = Date.now();
    
    // 防抖：30秒内不重复检查
    if (now - lastCheck < 30000) {
      return;
    }
    
    // 限制总检查次数
    if (checkCount > 50) {
      return;
    }
    
    setLastCheck(now);
    setCheckCount(prev => prev + 1);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.authenticated && status === 'authenticated') {
        console.log('🔄 检测到会话不一致，刷新会话状态');
        await update();
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('会话健康检查失败:', error.message);
      }
    }
  }, [lastCheck, checkCount, status, update]);

  useEffect(() => {
    // 只在认证状态下检查，且大幅减少频率
    if (status !== 'authenticated') return;
    
    // 🔧 关键修复：大幅减少检查频率 - 每5分钟一次
    const interval = setInterval(checkSessionHealth, 5 * 60 * 1000);
    
    // 页面可见时检查
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(checkSessionHealth, 5000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, checkSessionHealth]);

  return children;
}

// 全局错误处理组件
function GlobalErrorHandler({ children }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      console.error('全局错误:', event.error);
      
      if (event.error?.message?.includes('ResizeObserver')) return;
      
      setError({
        message: event.error?.message || '发生未知错误'
      });
    };

    const handleRejection = (event) => {
      console.error('未处理的 Promise 拒绝:', event.reason);
      
      if (event.reason?.name === 'AbortError') return;
      if (event.reason?.message?.includes('fetch')) return;
      
      setError({
        message: event.reason?.message || '请求失败',
        type: 'promise'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">应用错误</h2>
          </div>
          
          <p className="text-gray-600 mb-4">{error.message}</p>
          
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              刷新页面
            </button>
            <button
              onClick={() => setError(null)}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

// 主应用组件
function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    console.log('🚀 应用启动:', {
      path: router.pathname,
      timestamp: new Date().toISOString()
    });
  }, [router.pathname]);

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>AI项目平台</title>
        <meta name="description" content="智能AI助手平台，提供聊天、知识管理与语音交互功能" />
        <link rel="icon" href="/favicon.ico" />
        
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>

      <GlobalErrorHandler>
        <SessionProvider 
          session={session}
          refetchInterval={10 * 60} // 10分钟刷新一次会话
          refetchOnWindowFocus={false} // 关闭窗口聚焦时刷新
        >
          <SessionMonitor>
            <UserProvider>
              <KnowledgeProvider>
                {isClient ? <Component {...pageProps} /> : null}
              </KnowledgeProvider>
            </UserProvider>
          </SessionMonitor>
        </SessionProvider>
      </GlobalErrorHandler>
    </ErrorBoundary>
  );
}

export default MyApp;