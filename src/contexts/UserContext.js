// contexts/UserContext.js - 简化版本
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { getSession, signIn, signOut } from 'next-auth/react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const router = useRouter();

  // 简化：安全的会话获取
  const safeGetSession = useCallback(async () => {
    try {
      const session = await getSession();
      
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      
      return session;
    } catch (error) {
      console.error('获取会话失败:', error);
      setUser(null);
      return null;
    }
  }, []);

  // 简化：登录函数
  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError(result.error);
        return { success: false, error: result.error };
      }

      if (result?.ok) {
        // 等待会话更新
        await new Promise(resolve => setTimeout(resolve, 500));
        const session = await safeGetSession();
        
        if (session?.user) {
          // 重定向到请求的页面或首页
          const redirectUrl = router.query.callbackUrl || '/dashboard';
          router.push(redirectUrl);
          return { success: true, user: session.user };
        } else {
          const errorMsg = '登录成功但会话验证失败，请重试';
          setAuthError(errorMsg);
          return { success: false, error: errorMsg };
        }
      }
      
      const errorMsg = '登录响应异常';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
      
    } catch (error) {
      console.error('登录异常:', error);
      setAuthError(error.message);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  }, [router, safeGetSession]);

  // 简化：登出函数
  const logout = useCallback(async () => {
    try {
      setUser(null);
      await signOut({ redirect: false });
      router.push('/auth/signin');
    } catch (error) {
      console.error('登出异常:', error);
      throw error;
    }
  }, [router]);

  // 清除错误信息
  const clearAuthError = useCallback(() => setAuthError(''), []);

  // 初始加载
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      if (!mounted) return;
      
      try {
        await safeGetSession();
      } catch (error) {
        console.error('加载用户会话错误:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadUser();

    return () => {
      mounted = false;
    };
  }, [safeGetSession]);

  const value = useMemo(() => ({
    user,
    loading,
    authLoading,
    authError,
    isAuthenticated: !!user,
    login,
    logout,
    clearAuthError,
  }), [
    user,
    loading,
    authLoading,
    authError,
    login,
    logout,
    clearAuthError,
  ]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}

export default UserContext;