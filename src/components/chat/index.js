// src/components/chat/index.js - 彻底修复版本
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

// 修复：极简设备检测，避免任何可能的循环依赖
const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return { isMobile: false, browser: 'server' }
  }
  
  try {
    const userAgent = navigator.userAgent.toLowerCase()
    return {
      isMobile: /mobile|android|iphone|ipad|phone/i.test(userAgent),
      browser: userAgent.includes('chrome') ? 'Chrome' : 
               userAgent.includes('firefox') ? 'Firefox' : 
               userAgent.includes('safari') ? 'Safari' : 'Unknown'
    }
  } catch (error) {
    console.error('设备检测失败:', error)
    return { isMobile: false, browser: 'unknown' }
  }
}

// 修复：简化的错误边界组件
const SimpleErrorBoundary = ({ children, onError, onRetry }) => {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)

  const handleCatch = useCallback((error, errorInfo) => {
    console.error('错误边界捕获:', error, errorInfo)
    setHasError(true)
    setError(error)
    onError?.(error)
  }, [onError])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setError(null)
    onRetry?.()
  }, [onRetry])

  // 简单的错误边界实现
  if (hasError) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
        <div className="text-center p-4">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">组件加载失败</h3>
          <p className="text-gray-600 mb-4">
            {error?.message || '未知错误'}
          </p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 使用 try-catch 包装子组件
  try {
    return children
  } catch (error) {
    handleCatch(error, { componentStack: error.stack })
    return null
  }
}

// 修复：极简加载组件
const SimpleLoading = () => (
  <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-2 text-gray-600">加载中...</p>
    </div>
  </div>
)

// 修复：使用更安全的动态导入
const ChatComponent = dynamic(() => import('./ChatTabBase'), { 
  ssr: false,
  loading: () => <SimpleLoading />
})

// 修复：主组件 - 完全避免复杂状态逻辑
export default function ChatTab({ user, voiceEnabled, toggleVoice, className = '' }) {
  const [deviceInfo, setDeviceInfo] = useState({ isMobile: false, browser: 'unknown' })
  const [isClient, setIsClient] = useState(false)
  const [initError, setInitError] = useState(null)

  // 修复：简化客户端检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 修复：简化设备信息获取
  useEffect(() => {
    if (!isClient) return

    const init = () => {
      try {
        const info = getDeviceInfo()
        setDeviceInfo(info)
        setInitError(null)
      } catch (error) {
        console.error('初始化失败:', error)
        setInitError(error.message)
      }
    }

    // 延迟初始化，确保完全加载
    const timer = setTimeout(init, 100)
    return () => clearTimeout(timer)
  }, [isClient])

  const handleErrorRetry = useCallback(() => {
    setInitError(null)
    try {
      const info = getDeviceInfo()
      setDeviceInfo(info)
    } catch (error) {
      setInitError(error.message)
    }
  }, [])

  // 修复：简化渲染逻辑
  if (!isClient) {
    return <SimpleLoading />
  }

  if (initError) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
        <div className="text-center p-4">
          <div className="text-red-500 text-lg mb-2">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">初始化失败</h3>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button
            onClick={handleErrorRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重试初始化
          </button>
        </div>
      </div>
    )
  }

  return (
    <SimpleErrorBoundary
      onError={(error) => console.error('聊天组件错误:', error)}
      onRetry={handleErrorRetry}
    >
      <div className={`h-full ${className}`}>
        <ChatComponent
          user={user}
          voiceEnabled={voiceEnabled}
          toggleVoice={toggleVoice}
          isMobile={deviceInfo.isMobile}
          browserInfo={deviceInfo.browser}
        />
      </div>
    </SimpleErrorBoundary>
  )
}

// 修复：导出简单的设备检测函数供其他组件使用
export { getDeviceInfo }