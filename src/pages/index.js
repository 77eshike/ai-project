// /opt/ai-project/src/pages/index.js - 优化版本
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../lib/auth'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { getSession } from 'next-auth/react'

export default function Home({ user }) {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [status, setStatus] = useState('checking')

  // 客户端检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 🔧 关键修复：简化的重定向逻辑
  useEffect(() => {
    if (!isClient) return

    const checkAndRedirect = async () => {
      try {
        setStatus('checking')
        
        // 双重检查：服务器端用户 + 客户端会话
        const clientSession = await getSession()
        const isAuthenticated = !!(user || clientSession?.user)
        
        console.log('🔐 首页认证检查:', {
          serverUser: !!user,
          clientSession: !!clientSession?.user,
          isAuthenticated
        })

        if (isAuthenticated) {
          setStatus('redirecting')
          console.log('✅ 用户已认证，重定向到仪表板')
          
          // 使用replace避免历史记录问题
          setTimeout(() => {
            router.replace('/dashboard').catch(() => {
              // 如果路由失败，使用硬跳转
              window.location.href = '/dashboard'
            })
          }, 100)
        } else {
          setStatus('unauthenticated')
          console.log('❌ 用户未认证，显示首页')
        }
      } catch (error) {
        console.error('认证检查错误:', error)
        setStatus('error')
      }
    }

    checkAndRedirect()
  }, [user, router, isClient])

  // 加载状态
  if (!isClient || status === 'checking') {
    return <LoadingScreen message="检查登录状态..." />
  }

  // 重定向状态
  if (status === 'redirecting') {
    return <LoadingScreen message="跳转到仪表板..." />
  }

  // 错误状态
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">页面加载时出现错误</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  // 🔧 关键修复：未认证用户显示真正的首页（不是登录页）
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>AI项目平台 - 首页</title>
        <meta name="description" content="体验前沿人工智能技术，让复杂任务变得简单高效" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <i className="fas fa-brain text-2xl text-blue-600 mr-3"></i>
                <span className="text-xl font-bold text-gray-900">AI项目平台</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/auth/signin"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                登录
              </a>
              <a
                href="/auth/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                免费注册
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 英雄区域 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            开启智能
            <span className="text-blue-600">新时代</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            体验前沿人工智能技术，让复杂任务变得简单高效。强大的AI助手、智能项目管理，一切尽在掌握。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              免费开始使用
            </a>
            <a
              href="/auth/signin"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              已有账户登录
            </a>
          </div>
        </div>

        {/* 特性展示 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-robot text-blue-600 text-xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">智能AI助手</h3>
            <p className="text-gray-600">先进的自然语言处理能力，理解您的需求并提供精准帮助。</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-bolt text-green-600 text-xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">极速响应</h3>
            <p className="text-gray-600">毫秒级的AI推理速度，让您的工作流程更加流畅高效。</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-shield-alt text-purple-600 text-xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">安全可靠</h3>
            <p className="text-gray-600">企业级数据安全保障，您的隐私和数据安全是我们的首要任务。</p>
          </div>
        </div>

        {/* CTA 区域 */}
        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">准备好开始了吗？</h2>
          <p className="text-blue-100 mb-6 text-lg">立即注册，体验AI带来的无限可能</p>
          <a
            href="/auth/signup"
            className="inline-flex items-center bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            <i className="fas fa-rocket mr-2"></i>
            立即开始免费体验
          </a>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 AI项目平台. 保留所有权利.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// 加载组件
function LoadingScreen({ message = "加载中..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  try {
    const session = await getServerSession(context.req, context.res, authOptions)

    // 🔧 关键修复：不在服务器端重定向，由客户端处理
    // 只返回用户信息，避免中间件冲突
    return {
      props: {
        user: session?.user || null
      }
    }
  } catch (error) {
    console.error('首页服务器端错误:', error)
    return {
      props: {
        user: null
      }
    }
  }
}