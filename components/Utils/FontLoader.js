import { useEffect } from 'react'

export default function FontLoader() {
  useEffect(() => {
    // 检测 Font Awesome 是否加载完成
    const checkFontsLoaded = () => {
      if (typeof document !== 'undefined') {
        document.body.classList.add('fonts-loaded')
      }
    }

    // 如果 Font Awesome 已经加载
    if (typeof document !== 'undefined') {
      const fontAwesomeLink = document.querySelector('link[href*="font-awesome"]')
      if (fontAwesomeLink && fontAwesomeLink.sheet) {
        checkFontsLoaded()
      } else {
        // 监听字体加载
        const timer = setTimeout(checkFontsLoaded, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  return null
}
