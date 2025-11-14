// src/components/ClientApp.js - 优化版本
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// 极简路由守卫
function SimpleRouteGuard() {
  const router = useRouter();
  const { status } = useSession();
  const lastPathRef = useRef('');
  const guardCheckCountRef = useRef(0);

  useEffect(() => {
    if (status === 'loading') return;

    const currentPath = router.pathname;
    
    // 相同路径跳过重复检查
    if (lastPathRef.current === currentPath) {
      return;
    }
    
    lastPathRef.current = currentPath;
    guardCheckCountRef.current += 1;
    
    const isAuthPage = currentPath.includes('/auth/');

    console.log('🛡️ 路由守卫检查:', {
      path: currentPath,
      status,
      isAuthPage,
      checkCount: guardCheckCountRef.current
    });

    // 仅处理已认证用户访问登录页的情况
    if (status === 'authenticated' && isAuthPage) {
      console.log('🔐 已登录用户访问登录页，重定向到仪表板');
      router.replace('/dashboard');
    }
    
    // 防止检查次数过多
    if (guardCheckCountRef.current > 10) {
      console.warn('⚠️ 路由守卫检查次数过多，可能存在循环');
    }

  }, [router, status, router.pathname]);

  return null;
}

// 极简认证错误拦截器
function useSimpleAuthInterceptor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch.apply(this, args);
        
        // 只处理严重的认证错误
        if (response.status === 401) {
          const currentPath = window.location.pathname;
          console.log('🚨 检测到401错误，当前路径:', currentPath);
          
          // 只在明确需要登录的页面重定向
          if (currentPath.includes('/dashboard') || 
              currentPath.includes('/chat') || 
              currentPath.includes('/projects')) {
            console.log('🔐 保护页面401错误，准备重定向');
            setTimeout(() => {
              window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`;
            }, 1000);
          }
        }
        
        return response;
      } catch (error) {
        console.error('🔐 请求错误:', error);
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

export default function ClientApp() {
  useSimpleAuthInterceptor();
  return <SimpleRouteGuard />;
}