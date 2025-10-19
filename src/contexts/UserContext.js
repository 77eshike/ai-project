import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { getSession, signIn, signOut } from 'next-auth/react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 检查是否在浏览器环境中
    const isBrowser = typeof window !== 'undefined';
    
    async function loadUser() {
      try {
        const session = await getSession();
        if (session?.user) {
          setUser(session.user);
          
          // 从本地存储加载语音设置（仅在浏览器环境中）
          if (isBrowser) {
            const savedVoiceSetting = localStorage.getItem('voiceEnabled');
            if (savedVoiceSetting !== null) {
              setVoiceEnabled(JSON.parse(savedVoiceSetting));
            }
          }
        }
      } catch (error) {
        console.error('加载用户会话错误:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadUser();

    // 路由变化时刷新会话
    const handleRouteChange = () => {
      getSession().then(session => {
        if (session?.user) {
          setUser(session.user);
        }
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // 登录函数
  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // 解析错误信息
        let errorMessage = '登录失败，请重试';
        if (result.error.includes('邮箱和密码不能为空')) {
          errorMessage = '请填写邮箱和密码';
        } else if (result.error.includes('用户不存在')) {
          errorMessage = '用户不存在';
        } else if (result.error.includes('密码错误')) {
          errorMessage = '密码错误';
        } else if (result.error.includes('用户密码未设置')) {
          errorMessage = '该账号未设置密码';
        } else if (result.error.includes('邮箱未验证')) {
          errorMessage = '请先验证您的邮箱地址';
        }
        
        setAuthError(errorMessage);
        return false;
      }

      if (result?.ok) {
        // 等待会话更新
        const session = await getSession();
        if (session?.user) {
          setUser(session.user);
          // 重定向到请求的页面或首页
          const redirectUrl = router.query.callbackUrl || '/dashboard';
          router.push(redirectUrl);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('登录失败，请重试');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  // 注册函数
  const register = useCallback(async (email, password, name) => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        // 注册成功后自动登录
        const loginSuccess = await login(email, password);
        return loginSuccess;
      } else {
        setAuthError(data.message || '注册失败');
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setAuthError('注册失败，请重试');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [login]);

  // 登出函数
  const logout = useCallback(async (redirectPath = '/auth/signin') => {
    try {
      await signOut({ redirect: false });
      setUser(null);
      // 清除任何本地存储的用户数据（仅在浏览器环境中）
      if (typeof window !== 'undefined') {
        localStorage.removeItem('voiceEnabled');
      }
      router.push(redirectPath);
    } catch (error) {
      console.error('登出错误:', error);
      throw error;
    }
  }, [router]);

  // 更新用户信息
  const updateUser = useCallback((updatedData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedData }));
  }, []);

  // 切换语音设置
  const toggleVoice = useCallback((enabled) => {
    setVoiceEnabled(enabled);
    // 保存到本地存储（仅在浏览器环境中）
    if (typeof window !== 'undefined') {
      localStorage.setItem('voiceEnabled', JSON.stringify(enabled));
    }
  }, []);

  // 清除错误信息
  const clearAuthError = useCallback(() => setAuthError(''), []);

  // 使用 useMemo 优化 context value，避免不必要的重渲染
  const value = useMemo(() => ({
    user,
    login,
    logout,
    register,
    updateUser,
    toggleVoice,
    loading,
    authLoading,
    authError,
    voiceEnabled,
    clearAuthError
  }), [
    user,
    login,
    logout,
    register,
    updateUser,
    toggleVoice,
    loading,
    authLoading,
    authError,
    voiceEnabled,
    clearAuthError
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
    throw new Error('useUser必须在UserProvider内部使用');
  }
  return context;
}

export default UserContext;