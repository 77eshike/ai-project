// src/components/SessionProvider.js - 修复版本
'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { useEffect, useState } from 'react'

// 用于跟踪会话请求次数
let sessionRequestCount = 0;
const MAX_SESSION_REQUESTS = 10;

export default function SessionProvider({ children, session }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false);
  
  useEffect(() => {
    // 检测移动设备
    const checkIsMobile = () => {
      return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    };
    
    // 安全检查开发环境
    const checkIsDevelopment = () => {
      return window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.hostname.includes('.local') ||
             window.location.port === '3000';
    };
    
    setIsMobile(checkIsMobile());
    setIsDevelopment(checkIsDevelopment());
  }, []);

  // 根据设备类型调整刷新间隔
  const getRefetchInterval = () => {
    if (isDevelopment) {
      // 开发环境中减少刷新频率
      return 10 * 60; // 10分钟
    }
    
    if (isMobile) {
      // 移动设备上使用较长的刷新间隔
      return 15 * 60; // 15分钟
    }
    
    return 5 * 60; // 默认5分钟
  };

  // 根据设备类型调整窗口焦点刷新
  const shouldRefetchOnWindowFocus = () => {
    if (isDevelopment) {
      return false; // 开发环境中禁用
    }
    
    if (isMobile) {
      return false; // 移动设备上禁用
    }
    
    return true; // 桌面设备启用
  };

  return (
    <NextAuthSessionProvider 
      session={session}
      refetchInterval={getRefetchInterval()}
      refetchOnWindowFocus={shouldRefetchOnWindowFocus()}
      // 添加会话请求限制
      onSessionRequest={() => {
        sessionRequestCount++;
        
        // 如果会话请求过于频繁，记录警告
        if (sessionRequestCount > MAX_SESSION_REQUESTS && isDevelopment) {
          console.warn('检测到频繁的会话请求，这可能会导致性能问题');
        }
      }}
    >
      {children}
    </NextAuthSessionProvider>
  )
}