// hooks/useOptimizedSession.js
import { useState, useEffect, useCallback } from 'react';
import { useSession as useNextAuthSession } from 'next-auth/react';

// 会话状态缓存
let sessionStateCache = null;

export const useOptimizedSession = () => {
  const { data: session, status, update } = useNextAuthSession();
  const [optimizedSession, setOptimizedSession] = useState(sessionStateCache || session);
  const [isLoading, setIsLoading] = useState(status === 'loading');

  // 更新会话状态
  const updateSession = useCallback(async (newSession) => {
    try {
      setIsLoading(true);
      const updatedSession = await update(newSession);
      sessionStateCache = updatedSession;
      setOptimizedSession(updatedSession);
      return updatedSession;
    } catch (error) {
      console.error('更新会话失败:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [update]);

  // 初始加载或会话变化时更新
  useEffect(() => {
    if (session && session !== optimizedSession) {
      sessionStateCache = session;
      setOptimizedSession(session);
    }
    
    setIsLoading(status === 'loading');
  }, [session, status, optimizedSession]);

  // 添加移动设备检测和优化
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && process.env.NODE_ENV === 'development') {
      console.log('移动设备检测到，应用会话优化');
      
      // 在移动设备上，减少会话更新的频率
      const interval = setInterval(() => {
        if (sessionStateCache) {
          setOptimizedSession(sessionStateCache);
        }
      }, 30000); // 每30秒更新一次
      
      return () => clearInterval(interval);
    }
  }, []);

  return {
    data: optimizedSession,
    status: isLoading ? 'loading' : status,
    update: updateSession,
  };
};