// src/components/chat/index.js - 企业级修复版
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import SpeechErrorBoundary from '../ErrorBoundary/SpeechErrorBoundary'
import { getDeviceInfo, isMobileDevice } from '../Utils/deviceUtils'

// ✅ 动态导入，防止 SSR 提前执行语音 hook
const ChatTabDesktop = dynamic(() => import('./ChatTabDesktop'), { 
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-64">加载桌面组件中...</div>
})
const ChatTabMobile = dynamic(() => import('./ChatTabMobile'), { 
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-64">加载移动组件中...</div>
})

export default function ChatTab({ user, voiceEnabled, toggleVoice, className = '' }) {
  const [isMobile, setIsMobile] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState({})
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // 🧩 Step 1: 确认客户端环境
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClient(true)
    }
  }, [])

  // 🧩 Step 2: 检测设备环境
  useEffect(() => {
    if (!isClient) return

    const initialize = async () => {
      try {
        const info = getDeviceInfo()
        const mobile = isMobileDevice()

        console.log('🎯 设备检测完成:', {
          设备信息: info,
          移动端检测: mobile,
          用户代理: navigator.userAgent,
        })

        setDeviceInfo(info)
        setIsMobile(mobile)
        setError(null)
      } catch (err) {
        console.error('设备检测错误:', err)
        setError(`设备检测失败: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    // 延迟 50ms，等待浏览器 API 全部加载
    const timer = setTimeout(initialize, 50)
    return () => clearTimeout(timer)
  }, [isClient])

  // 🧩 Step 3: 动态监听窗口变化
  useEffect(() => {
    if (!isClient) return
    const handleResize = () => {
      try {
        const mobile = isMobileDevice()
        if (mobile !== isMobile) {
          console.log('🔄 设备类型变化:', { 之前: isMobile, 现在: mobile })
          setIsMobile(mobile)
        }
      } catch (err) {
        console.error('设备检测错误:', err)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isClient, isMobile])

  // 🧩 Step 4: 语音开关
  const handleVoiceToggle = useCallback(
    (enabled) => {
      console.log('🔊 语音功能切换:', enabled)
      toggleVoice(enabled)
    },
    [toggleVoice]
  )

  // 🧩 Step 5: 错误重试
  const handleErrorRetry = useCallback(() => {
    setError(null)
    setIsLoading(true)

    setTimeout(() => {
      const info = getDeviceInfo()
      const mobile = isMobileDevice()
      setDeviceInfo(info)
      setIsMobile(mobile)
      setIsLoading(false)
    }, 400)
  }, [])

  // 🧩 Step 6: 状态渲染控制
  if (!isClient || isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载聊天模块中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">❌</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleErrorRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // 🧩 Step 7: 根据设备加载正确组件
  const Component = isMobile ? ChatTabMobile : ChatTabDesktop

  console.log('🎯 加载聊天组件:', {
    使用组件: isMobile ? 'ChatTabMobile' : 'ChatTabDesktop',
    设备类型: deviceInfo.deviceType,
    浏览器: deviceInfo.browser,
    平台: deviceInfo.platform,
  })

  return (
    <SpeechErrorBoundary
      onError={(err) => console.error('语音组件捕获错误:', err)}
      onRetry={handleErrorRetry}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <div className={`h-full ${className}`}>
        <Component
          user={user}
          voiceEnabled={voiceEnabled}
          toggleVoice={handleVoiceToggle}
        />
      </div>
    </SpeechErrorBoundary>
  )
}