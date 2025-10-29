// /opt/ai-project/src/hooks/useSessionStatus.js - 配套Hook
import { useState, useEffect, useCallback } from 'react';

export const useSessionStatus = (options = {}) => {
  const {
    interval = 30000, // 30秒检查一次
    autoRefresh = true,
    onSessionChange = null
  } = options;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkSession = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setLoading(true);
    }

    try {
      console.log('🔄 检查会话状态...');
      
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Session check failed');
      }

      const previousAuthenticated = session?.authenticated;
      const currentAuthenticated = data.authenticated;

      // 更新状态
      setSession(data);
      setError(null);
      setLastChecked(new Date());

      // 触发会话变化回调
      if (onSessionChange && previousAuthenticated !== currentAuthenticated) {
        onSessionChange({
          previous: session,
          current: data,
          authenticated: currentAuthenticated
        });
      }

      console.log('✅ 会话检查完成:', {
        authenticated: data.authenticated,
        userId: data.user?.id || 'null'
      });

      return data;
    } catch (err) {
      console.error('❌ 会话检查失败:', err);
      
      const errorState = {
        message: err.message,
        timestamp: new Date().toISOString()
      };
      
      setError(errorState);
      
      // 只有在初始加载时设置会话为null
      if (isInitial) {
        setSession({
          authenticated: false,
          user: null,
          expires: null
        });
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [session, onSessionChange]);

  // 手动刷新会话
  const refreshSession = useCallback(() => {
    return checkSession();
  }, [checkSession]);

  // 初始加载和定期检查
  useEffect(() => {
    let intervalId = null;

    const initialize = async () => {
      await checkSession(true);
      
      if (autoRefresh) {
        intervalId = setInterval(checkSession, interval);
      }
    };

    initialize();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkSession, autoRefresh, interval]);

  // 页面可见性变化时刷新会话
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSession]);

  return {
    // 状态
    session,
    loading,
    error,
    lastChecked,
    
    // 计算属性
    isAuthenticated: session?.authenticated || false,
    user: session?.user || null,
    expires: session?.expires || null,
    
    // 方法
    refreshSession,
    
    // 工具函数
    hasRole: (role) => {
      return session?.user?.role === role;
    },
    
    hasPermission: (permission) => {
      // 简单的权限检查逻辑
      const userRole = session?.user?.role;
      if (!userRole) return false;
      
      const rolePermissions = {
        ADMIN: ['read', 'write', 'delete', 'admin'],
        USER: ['read', 'write'],
        GUEST: ['read']
      };
      
      return rolePermissions[userRole]?.includes(permission) || false;
    }
  };
};

// 默认导出
export default useSessionStatus;