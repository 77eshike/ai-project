// pages/auth/signin.js
import { useState, useEffect } from 'react'
import { getCsrfToken, getProviders, signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function SignIn({ csrfToken, providers }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice)
    }
  }, [])

  useEffect(() => {
    // 检查URL中的错误参数
    if (router.query.error) {
      const errorMap = {
        'CredentialsSignin': '邮箱或密码错误',
        'SessionRequired': '请先登录',
        'Default': '登录过程中发生错误'
      }
      setError(errorMap[router.query.error] || errorMap['Default'])
    }
  }, [router.query.error])

  useEffect(() => {
    // 如果用户已经登录，直接跳转
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (session) {
          const callbackUrl = router.query.callbackUrl || '/dashboard'
          console.log('✅ 用户已登录，跳转到:', callbackUrl)
          router.push(callbackUrl)
        }
      } catch (error) {
        console.error('检查会话错误:', error)
      }
    }

    if (isClient) {
      checkAuth()
    }
  }, [isClient, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const callbackUrl = router.query.callbackUrl || '/dashboard'
      console.log('🔐 开始登录，回调URL:', callbackUrl)

      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      console.log('🔐 登录结果:', result)

      if (result?.error) {
        // 错误处理
        let errorMessage = '登录失败'
        
        if (result.error.includes('密码错误') || result.error.includes('邮箱或密码错误')) {
          errorMessage = '邮箱或密码错误'
        } else if (result.error.includes('邮箱未验证')) {
          errorMessage = '请先验证您的邮箱地址'
        } else if (result.error.includes('账户已被禁用')) {
          errorMessage = '您的账户已被禁用，请联系管理员'
        } else if (result.error.includes('未设置密码')) {
          errorMessage = '该账户未设置密码，请使用其他登录方式'
        } else {
          errorMessage = result.error
        }
        
        setError(errorMessage)
      } else if (result?.ok) {
        // 登录成功
        console.log('✅ 登录成功，跳转到:', callbackUrl)
        
        // 短暂延迟后跳转
        setTimeout(() => {
          router.push(callbackUrl)
        }, 300)
      }
    } catch (error) {
      console.error('❌ 登录异常:', error)
      setError('登录过程中发生错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 服务器端渲染的简单版本
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Head>
          <title>登录 - AI项目平台</title>
          <meta name="description" content="登录AI项目平台" />
        </Head>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>登录 - AI项目平台</title>
        <meta name="description" content="登录AI项目平台" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${isMobile ? 'mobile-layout' : ''}`}>
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              登录您的账户
            </h2>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  邮箱地址
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    登录中...
                  </>
                ) : '登录'}
              </button>
            </div>
          </form>

          {/* 其他登录方式... */}
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps(context) {
  const csrfToken = await getCsrfToken(context)
  const providers = await getProviders()
  
  return {
    props: { 
      csrfToken,
      providers: providers ? JSON.parse(JSON.stringify(providers)) : null
    },
  }
}