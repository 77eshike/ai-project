// hooks/useControlledSession.js
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 完全手动控制的会话 Hook
 */
export function useControlledSession() {
  const { data: session, status, update } = useSession();
  const [controlledSession, setControlledSession] = useState(null);
  const [controlledStatus, setControlledStatus] = useState('loading');
  const lastUpdateRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 手动刷新会话（最多每30秒一次）
  const refreshSession = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 30000) {
      console.log('⏳ 跳过频繁的会话刷新');
      return;
    }
    
    lastUpdateRef.current = now;
    console.log('🔄 手动刷新会话');
    
    try {
      await update();
    } catch (error) {
      console.error('刷新会话失败:', error);
    }
  }, [update]);

  // 只在会话真正变化时更新，且添加防抖
  useEffect(() => {
    if (!isMountedRef.current) return;

    const updateSession = () => {
      const now = Date.now();
      
      // 防抖：至少间隔5秒才更新状态
      if (now - lastUpdateRef.current < 5000) {
        return;
      }

      let shouldUpdate = false;
      
      // 检查会话ID是否变化
      if (session?.user?.id !== controlledSession?.user?.id) {
        shouldUpdate = true;
      }
      
      // 检查状态是否从 loading 变为其他状态
      if (controlledStatus === 'loading' && status !== 'loading') {
        shouldUpdate = true;
      }
      
      // 检查认证状态变化
      if ((controlledStatus === 'authenticated' && status !== 'authenticated') ||
          (controlledStatus !== 'authenticated' && status === 'authenticated')) {
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        setControlledSession(session);
        setControlledStatus(status);
        lastUpdateRef.current = now;
        console.log('✅ 更新受控会话状态:', status);
      }
    };

    // 使用 setTimeout 进行防抖
    const timeoutId = setTimeout(updateSession, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [session, status, controlledSession, controlledStatus]);

  return {
    data: controlledSession,
    status: controlledStatus,
    refreshSession,
    isAuthenticated: controlledStatus === 'authenticated',
    isLoading: controlledStatus === 'loading'
  };
}