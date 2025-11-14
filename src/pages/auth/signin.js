// pages/auth/signin.js - 完全修复版本 (解决重定向循环)
import { useState, useEffect } from 'react'
import { getCsrfToken, getProviders, signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

// 错误消息映射
const ERROR_MESSAGES = {
  'CredentialsSignin': '邮箱或密码错误',
  'SessionRequired': '请先登录',
  'Configuration': '系统配置错误',
  'AccessDenied': '访问被拒绝',
  'Verification': '验证失败',
  'Default': '登录过程中发生错误',
  '密码错误': '邮箱或密码错误',
  '邮箱或密码错误': '邮箱或密码错误',
  'authorize': '认证失败',
  'credentials': '凭据错误',
}

export default function SignIn({ csrfToken, providers, serverSession }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    
    // 从本地存储恢复记住我状态
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  // 🔧 关键修复：简化认证状态检查
  useEffect(() => {
    if (!isClient || hasCheckedAuth) return
    
    const checkAuth = async () => {
      try {
        console.log('🔍 检查用户认证状态...')
        
        // 使用服务器端会话和客户端会话双重检查
        let session = serverSession;
        if (!session) {
          session = await getSession();
        }
        
        if (session?.user) {
          const callbackUrl = router.query.callbackUrl;
          
          // 🔧 关键修复：验证和清理回调URL
          let redirectUrl = '/dashboard';
          if (callbackUrl && 
              callbackUrl !== '/auth/signin' && 
              callbackUrl.startsWith('/') &&
              !callbackUrl.includes('//')) {
            redirectUrl = callbackUrl;
          }
          
          console.log('✅ 用户已登录，准备跳转到:', redirectUrl);
          setHasCheckedAuth(true);
          
          // 🔧 关键修复：添加延迟，避免与注册流程冲突
          setTimeout(() => {
            console.log('🔄 执行跳转到:', redirectUrl);
            // 使用replace避免历史记录问题
            router.replace(redirectUrl).catch(error => {
              console.error('路由跳转失败:', error);
              // 备用方案：硬跳转
              window.location.href = redirectUrl;
            });
          }, 300);
        } else {
          setHasCheckedAuth(true);
        }
      } catch (error) {
        console.error('检查会话错误:', error);
        setHasCheckedAuth(true);
      }
    }

    // 🔧 关键修复：添加防抖，避免重复检查
    const timeoutId = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeoutId);
  }, [isClient, router, hasCheckedAuth, serverSession]);

  // 处理URL错误参数
  useEffect(() => {
    if (router.query.error) {
      const errorKey = Object.keys(ERROR_MESSAGES).find(key => 
        router.query.error.includes(key)
      );
      const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : ERROR_MESSAGES['Default'];
      setError(errorMessage);
      
      // 清除URL中的错误参数
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, document.title, url.toString());
    }
    
    // 处理注册成功消息
    if (router.query.message === 'registered') {
      setError(''); // 清除可能存在的错误
      // 可以在这里显示注册成功的提示
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [router.query.error, router.query.message]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 基础验证
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    
    if (!password) {
      setError('请输入密码')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let callbackUrl = router.query.callbackUrl || '/dashboard';
      
      // 🔧 关键修复：清理和验证回调URL
      if (callbackUrl === '/auth/signin' || !callbackUrl.startsWith('/')) {
        callbackUrl = '/dashboard';
      }
      
      const normalizedEmail = email.trim().toLowerCase()
      
      console.log('🔐 开始登录:', { 
        email: normalizedEmail.substring(0, 3) + '***',
        callbackUrl 
      })

      // 处理记住我功能
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', normalizedEmail)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // 🔧 关键修复：使用简化的登录调用
      const result = await signIn('credentials', {
        email: normalizedEmail,
        password,
        redirect: false
      })

      console.log('🔐 登录API响应:', { 
        ok: result?.ok, 
        error: result?.error,
        url: result?.url 
      })

      if (result?.error) {
        // 简化的错误处理
        let errorMessage = '邮箱或密码错误';
        
        if (result.error.includes('Configuration') || result.error.includes('authorize')) {
          errorMessage = '系统配置错误，请联系管理员';
        }
        
        setError(errorMessage);
        console.error('❌ 登录失败:', result.error);
        
        // 清空密码字段
        setPassword('');
      } else if (result?.ok) {
        // 登录成功
        console.log('✅ 登录成功');
        
        // 🔧 关键修复：使用硬跳转，不使用next-auth的URL
        setTimeout(() => {
          console.log('🔄 跳转到:', callbackUrl);
          window.location.href = callbackUrl;
        }, 500);
      } else {
        setError('登录响应异常，请重试');
        console.error('❌ 未知登录响应:', result);
      }
    } catch (error) {
      console.error('❌ 登录异常:', error);
      setError('登录过程中发生错误，请重试');
    } finally {
      setIsLoading(false);
    }
  }

  // 处理第三方登录
  const handleOAuthSignIn = async (providerId) => {
    try {
      setIsLoading(true)
      setError('')
      
      let callbackUrl = router.query.callbackUrl || '/dashboard';
      if (callbackUrl === '/auth/signin') {
        callbackUrl = '/dashboard';
      }
      
      await signIn(providerId, {
        callbackUrl: callbackUrl
      })
    } catch (error) {
      console.error('❌ 第三方登录错误:', error)
      setError('第三方登录失败，请重试')
      setIsLoading(false)
    }
  }

  // 紧急修复功能
  const handleEmergencyFix = () => {
    console.log('🚨 执行紧急修复...');
    
    // 清除所有存储
    localStorage.clear();
    sessionStorage.clear();
    
    // 清除cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.includes('auth') || name.includes('session') || name.includes('next')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
    
    alert('认证状态已清除，页面将刷新');
    window.location.reload();
  };

  // 渲染状态
  if (!isClient) {
    return <LoadingScreen message="加载中..." />
  }

  if (!hasCheckedAuth) {
    return <LoadingScreen message="检查登录状态..." />
  }

  return (
    <>
      <Head>
        <title>登录 - AI项目平台</title>
        <meta name="description" content="登录AI项目平台，开始使用AI功能" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* 头部 */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              欢迎回来
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              登录您的账户继续使用
            </p>
            
            {/* 🔧 紧急修复按钮 */}
            <div className="mt-4">
              <button
                onClick={handleEmergencyFix}
                className="text-xs text-red-600 hover:text-red-500 underline"
                title="清除所有认证状态"
              >
                遇到登录问题？点击这里修复
              </button>
            </div>
          </div>
          
          {/* 登录表单 */}
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
              
              {/* 错误显示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2 animate-shake">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
              
              {/* 表单字段 */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
                    placeholder="请输入您的邮箱地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    密码
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
                    placeholder="请输入您的密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* 辅助功能 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600">记住邮箱</span>
                </label>

                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  忘记密码?
                </Link>
              </div>

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>登录中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>登录</span>
                  </>
                )}
              </button>
            </form>

            {/* 注册链接 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                还没有账户?{' '}
                <Link 
                  href="/auth/signup" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  立即注册
                </Link>
              </p>
            </div>

            {/* 第三方登录 */}
            {providers && Object.values(providers).filter(p => p.id !== 'credentials').length > 0 && (
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">其他登录方式</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {Object.values(providers)
                    .filter(provider => provider.id !== 'credentials')
                    .map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleOAuthSignIn(provider.id)}
                        disabled={isLoading}
                        className="w-full py-2 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>使用 {provider.name} 登录</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// 加载组件
function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  )
}

// 🔧 关键修复：服务器端认证检查
export async function getServerSideProps(context) {
  try {
    const [csrfToken, providers, session] = await Promise.all([
      getCsrfToken(context),
      getProviders(),
      getSession(context)
    ])

    // 🔧 关键修复：如果用户已登录，在服务器端直接重定向
    if (session?.user) {
      const callbackUrl = context.query.callbackUrl;
      
      // 验证和清理回调URL
      let redirectUrl = '/dashboard';
      if (callbackUrl && 
          callbackUrl !== '/auth/signin' && 
          callbackUrl.startsWith('/') &&
          !callbackUrl.includes('//')) {
        redirectUrl = callbackUrl;
      }
      
      console.log('🔄 服务器端重定向:', redirectUrl);
      
      return {
        redirect: {
          destination: redirectUrl,
          permanent: false,
        },
      }
    }

    return {
      props: { 
        csrfToken,
        providers: providers ? Object.values(providers) : [],
        serverSession: session || null
      },
    }
  } catch (error) {
    console.error('登录页面服务器端错误:', error);
    
    // 🔧 关键修复：出错时返回空会话，避免阻塞
    return {
      props: { 
        csrfToken: null,
        providers: [],
        serverSession: null
      },
    }
  }
}