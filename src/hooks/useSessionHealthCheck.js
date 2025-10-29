// hooks/useSessionHealthCheck.js - 配套Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';

export const useSessionHealthCheck = (options = {}) => {
  const {
    enabled = true,
    interval = 60000, // 1分钟检查一次
    onSessionExpired = null,
    onSessionValid = null,
    onError = null
  } = options;

  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('unknown'); // 'valid', 'invalid', 'unknown'
  
  const router = useRouter();
  const checkCountRef = useRef(0);
  const isMountedRef = useRef(true);

  const checkSessionHealth = useCallback(async () => {
    if (!isMountedRef.current || !enabled) return;

    setIsChecking(true);
    setError(null);
    checkCountRef.current += 1;

    const checkId = checkCountRef.current;
    console.log(`🔍 [${checkId}] 开始会话健康检查...`);

    try {
      const response = await fetch('/api/auth/session-check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success && data.valid) {
        console.log(`✅ [${checkId}] 会话健康检查通过`, {
          userId: data.user.id,
          timestamp: data.timestamp
        });

        setSessionStatus('valid');
        setLastCheck(new Date());

        if (onSessionValid) {
          onSessionValid(data.user, data);
        }

      } else {
        console.warn(`❌ [${checkId}] 会话健康检查失败:`, data.error);
        
        setSessionStatus('invalid');
        setError(data.error);

        if (data.shouldRedirect) {
          console.log(`🔄 [${checkId}] 需要重定向到: ${data.redirectTo}`);
          
          if (onSessionExpired) {
            onSessionExpired(data);
          } else {
            // 默认重定向逻辑
            router.push(data.redirectTo || '/auth/signin');
          }
        }
      }

    } catch (error) {
      console.error(`❌ [${checkId}] 会话健康检查异常:`, error);
      
      setError(error.message);
      setSessionStatus('unknown'); // 网络错误时保持未知状态

      if (onError) {
        onError(error);
      }

      // 网络错误不触发重定向，避免误判
      if (!error.message.includes('fetch') && !error.message.includes('timeout')) {
        setSessionStatus('invalid');
      }
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [enabled, router, onSessionExpired, onSessionValid, onError]);

  // 定期检查
  useEffect(() => {
    if (!enabled) return;

    let intervalId = null;

    const startChecking = () => {
      // 立即执行一次检查
      checkSessionHealth();
      
      // 设置定期检查
      intervalId = setInterval(checkSessionHealth, interval);
    };

    startChecking();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkSessionHealth, enabled, interval]);

  // 页面可见性变化时检查
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        console.log('👀 页面变为可见，检查会话状态');
        checkSessionHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkSessionHealth, enabled]);

  // 路由变化时检查（可选）
  useEffect(() => {
    const handleRouteChange = () => {
      if (enabled) {
        setTimeout(checkSessionHealth, 1000); // 延迟1秒检查
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, checkSessionHealth, enabled]);

  // 组件卸载保护
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    // 状态
    isChecking,
    lastCheck,
    error,
    sessionStatus,
    
    // 计算属性
    isSessionValid: sessionStatus === 'valid',
    isSessionInvalid: sessionStatus === 'invalid',
    isSessionUnknown: sessionStatus === 'unknown',
    
    // 方法
    checkSessionHealth,
    clearError: () => setError(null),
    
    // 统计
    checkCount: checkCountRef.current
  };
};

export default useSessionHealthCheck;