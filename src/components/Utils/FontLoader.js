// 更新 FontLoader 组件确保完全安全

import { useEffect } from 'react'

const FontLoader = () => {
  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    console.log('FontLoader running on client')

    const checkFontsLoaded = () => {
      try {
        document.body.classList.add('fonts-loaded')
        console.log('Fonts loaded class added')
      } catch (error) {
        console.log('Error adding fonts-loaded class:', error)
      }
    }

    // 直接添加类，不依赖复杂的检测
    checkFontsLoaded()

    // 安全超时后再次检查
    const timer = setTimeout(checkFontsLoaded, 1000)
    
    return () => {
      clearTimeout(timer)
    }
  }, [])

  // 这个组件不渲染任何内容
  return null
}

// 确保组件有显示名称
FontLoader.displayName = 'FontLoader'

export default FontLoader
