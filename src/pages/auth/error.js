// /src/pages/auth/error.js
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'

export default function AuthError() {
  const router = useRouter()
  const { error } = router.query

  useEffect(() => {
    // 如果没有任何错误，5秒后跳转到登录页
    if (!error) {
      const timer = setTimeout(() => {
        router.push('/auth/signin')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, router])

  const getErrorMessage = (error) => {
    switch (error) {
      case 'Configuration':
        return '服务器配置有问题，请联系管理员'
      case 'AccessDenied':
        return '您没有访问权限'
      case 'Verification':
        return '验证链接已过期或无效'
      case 'OAuthSignin':
        return 'OAuth登录过程中出错'
      case 'OAuthCallback':
        return 'OAuth回调过程中出错'
      case 'OAuthCreateAccount':
        return '创建OAuth账户过程中出错'
      case 'EmailCreateAccount':
        return '创建邮箱账户过程中出错'
      case 'Callback':
        return '回调过程中出错'
      case 'OAuthAccountNotLinked':
        return '邮箱已存在，但未与当前OAuth账户关联'
      case 'EmailSignin':
        return '发送验证邮件失败'
      case 'CredentialsSignin':
        return '邮箱或密码错误'
      case 'SessionRequired':
        return '请先登录以访问此页面'
      default:
        return '发生未知错误，请重试'
    }
  }

  return (
    <>
      <Head>
        <title>认证错误 - AI项目平台</title>
        <meta name="description" content="认证过程中发生错误" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              认证错误
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {error ? getErrorMessage(error) : '发生未知错误，5秒后将跳转到登录页面'}
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-center">
              <div className="text-sm">
                <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
                  返回登录页
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}