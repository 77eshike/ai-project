// src/hooks/useSessionHealth.js - 会话健康监控
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useSessionHealth() {
  const { data: session, status, update } = useSession();
  const [lastHealthyCheck, setLastHealthyCheck] = useState(Date.now());
  const [healthStatus, setHealthStatus] = useState('unknown');

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session-health', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.healthy) {
        setHealthStatus('healthy');
        setLastHealthyCheck(Date.now());
      } else {
        setHealthStatus('unhealthy');
        console.warn('❌ 会话健康检查失败:', data);
      }
    } catch (error) {
      console.error('❌ 会话健康检查错误:', error);
      setHealthStatus('error');
    }
  }, []);

  // 定期检查会话健康
  useEffect(() => {
    if (status !== 'authenticated') return;

    // 立即检查一次
    checkHealth();

    // 每2分钟检查一次
    const interval = setInterval(checkHealth, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [status, checkHealth]);

  // 页面可见时检查
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated') {
        checkHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, checkHealth]);

  return {
    healthStatus,
    lastHealthyCheck,
    checkHealth,
    isHealthy: healthStatus === 'healthy',
    sessionStatus: status
  };
}