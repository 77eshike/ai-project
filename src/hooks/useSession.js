// hooks/useSession.js - 优化的客户端Hook
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include' // 确保发送cookies
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSession(data);
      } else {
        setSession({ authenticated: false, user: null });
        setError(data.error);
      }
    } catch (err) {
      console.error('❌ 获取会话失败:', err);
      setError(err.message);
      setSession({ authenticated: false, user: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    // 监听路由变化重新获取会话
    const handleRouteChange = () => {
      fetchSession();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // 手动刷新会话
  const refreshSession = () => {
    return fetchSession();
  };

  return {
    data: session,
    loading,
    error,
    refresh: refreshSession,
    authenticated: session?.authenticated || false,
    user: session?.user || null
  };
}