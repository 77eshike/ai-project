// src/hooks/useAuth.js - 简化版本
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

export const useAuth = () => {
  const { data: session, status } = useSession();
  
  // 使用useMemo避免不必要的重新计算
  const authState = useMemo(() => ({
    session,
    status,
    isAuthenticated: status === 'authenticated' && !!session?.user,
    user: session?.user,
    // 添加明确的加载状态
    isLoading: status === 'loading',
    isReady: status !== 'loading' // 认证检查完成
  }), [session, status]);

  return authState;
};