// pages/_document.js - 进一步优化版本
import { Html, Head, Main, NextScript } from 'next/document'

// 🔧 配置常量
const CONFIG = {
  // 🔧 修复：移除外部字体，使用系统字体
  FONT_FAMILIES: [], // 清空字体数组
  THEME_COLOR: '#3B82F6',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://191413.ai'
}

export default function Document() {
  return (
    <Html lang="zh-CN" className="scroll-smooth">
      <Head>
        {/* 字符集 */}
        <meta charSet="utf-8" />
        
        {/* Favicon 和相关图标 */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content={CONFIG.THEME_COLOR} />
        
        {/* PWA 相关 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI项目平台" />
        
        {/* 🔧 修复：移除可能导致问题的预连接 */}
        {/* 
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        */}
        
        {/* 预连接关键域名 */}
        <link rel="dns-prefetch" href="https://191413.ai" />
        
        {/* 🔧 修复：完全移除外部字体加载 */}
        
        {/* 优化的备用字体样式 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* 优化的系统字体栈 */
              body {
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 
                            'Noto Sans', 'Liberation Sans', sans-serif, 'Apple Color Emoji', 
                            'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
                font-feature-settings: 'kern';
                font-kerning: normal;
                text-rendering: optimizeLegibility;
              }
              
              /* 中文系统字体备用 */
              .zh-cn body {
                font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', 
                            'Helvetica Neue', Arial, sans-serif;
              }
            `
          }}
        />
        
        {/* 关键 CSS 内联 - 优化版本 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* 防止 FOUC - 优化版本 */
              .js-loading {
                opacity: 0.99;
              }
              
              .js-loading * {
                transition: none !important;
                animation: none !important;
              }
              
              .js-loaded {
                opacity: 1;
                transition: opacity 0.2s ease-out;
              }
              
              /* 基础重置和优化 */
              *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              html {
                scroll-behavior: smooth;
                -webkit-text-size-adjust: 100%;
                text-size-adjust: 100%;
                -webkit-tap-highlight-color: transparent;
              }
              
              body {
                background-color: #ffffff;
                line-height: 1.6;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeSpeed;
                overflow-x: hidden;
              }
              
              /* 图片优化 */
              img {
                max-width: 100%;
                height: auto;
                display: block;
              }
              
              /* 链接优化 */
              a {
                color: inherit;
                text-decoration: none;
              }
              
              a:focus {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
              }
              
              /* 按钮优化 */
              button {
                border: none;
                background: none;
                cursor: pointer;
                font-family: inherit;
              }
              
              button:focus {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
              }
              
              /* 输入框优化 */
              input, textarea, select {
                font-family: inherit;
                font-size: inherit;
              }
              
              input:focus, textarea:focus, select:focus {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
              }
              
              /* 减少动画（可访问性） */
              @media (prefers-reduced-motion: reduce) {
                *,
                *::before,
                *::after {
                  animation-duration: 0.01ms !important;
                  animation-iteration-count: 1 !important;
                  transition-duration: 0.01ms !important;
                  scroll-behavior: auto !important;
                }
              }
              
              /* 高对比度模式支持 */
              @media (prefers-contrast: high) {
                :root {
                  --text-color: #000000;
                  --background-color: #ffffff;
                }
              }
              
              /* 深色模式预备 */
              @media (prefers-color-scheme: dark) {
                :root {
                  color-scheme: dark light;
                }
              }
              
              /* 选择文本样式 */
              ::selection {
                background-color: #3b82f6;
                color: white;
              }
              
              /* 滚动条样式 */
              ::-webkit-scrollbar {
                width: 8px;
              }
              
              ::-webkit-scrollbar-track {
                background: #f1f5f9;
              }
              
              ::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              
              ::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `
          }}
        />
        
        {/* 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "AI项目平台",
              "description": "智能AI助手平台，提供聊天、知识管理与语音交互功能",
              "url": CONFIG.APP_URL,
              "potentialAction": {
                "@type": "SearchAction",
                "target": `${CONFIG.APP_URL}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        
        {/* 安全策略相关 */}
        <meta httpEquiv="x-ua-compatible" content="IE=edge" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" />
      </Head>
      <body className="antialiased bg-white text-gray-900 js-loading">
        {/* 简化的首屏加载优化脚本 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 简化的性能监控
              window.__PERFORMANCE_MONITORING__ = {
                startTime: Date.now(),
                navigationStart: performance?.timing?.navigationStart || Date.now()
              };
              
              // 防止 FOUC
              document.documentElement.setAttribute('data-ssr', 'true');
              
              // 页面加载状态管理
              function handleDOMReady() {
                document.body.classList.remove('js-loading');
                document.body.classList.add('js-loaded');
                document.documentElement.setAttribute('data-loaded', 'true');
                
                performance?.mark?.('dom-ready');
              }
              
              // 执行初始化
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', handleDOMReady);
              } else {
                handleDOMReady();
              }
              
              // 网络状态检测
              window.addEventListener('online', function() {
                document.documentElement.classList.remove('offline');
              });
              
              window.addEventListener('offline', function() {
                document.documentElement.classList.add('offline');
              });
              
              // 简化的错误处理
              window.addEventListener('error', function(e) {
                console.error('页面错误:', e.error);
                // 防止错误冒泡但不影响用户体验
              });
              
              window.addEventListener('unhandledrejection', function(e) {
                console.error('未处理的 Promise 拒绝:', e.reason);
                e.preventDefault();
              });
            `
          }}
        />
        
        {/* 主应用内容 */}
        <div id="__app_root">
          <Main />
        </div>
        
        {/* Next.js 脚本 */}
        <NextScript />
        
        {/* 性能监控和错误报告 - 简化版本 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 性能监控 - 页面完全加载后
              window.addEventListener('load', function() {
                // 移除加载状态
                document.body.classList.remove('js-loading');
                document.body.classList.add('js-loaded');
                
                // 简化的性能测量
                if (window.__PERFORMANCE_MONITORING__) {
                  const now = Date.now();
                  const start = window.__PERFORMANCE_MONITORING__.startTime;
                  window.__PERFORMANCE_MONITORING__.loadTime = now;
                  
                  console.log('🚀 页面加载完成:', {
                    totalTime: Math.round(now - start) + 'ms',
                    domReady: Math.round((performance?.timing?.domContentLoadedEventStart || now) - start) + 'ms'
                  });
                }
                
                performance?.mark?.('page-loaded');
              });
              
              // 关键错误恢复
              let recoveryAttempts = 0;
              const maxRecoveryAttempts = 2;
              
              window.addEventListener('error', function(e) {
                const error = e.error;
                
                // 如果是关键错误且尝试次数未超过限制
                if (error && recoveryAttempts < maxRecoveryAttempts) {
                  const criticalErrors = [
                    'j is not a function',
                    'useRouter is not defined',
                    'Cannot read properties of undefined'
                  ];
                  
                  if (criticalErrors.some(msg => error.message.includes(msg))) {
                    console.warn('🛠️ 检测到关键错误，尝试恢复...');
                    recoveryAttempts++;
                    
                    // 延迟重试
                    setTimeout(() => {
                      if (!window.location.hash.includes('recovered')) {
                        window.location.hash = 'recovered=' + recoveryAttempts;
                        window.location.reload();
                      }
                    }, 1000);
                  }
                }
              });
            `
          }}
        />
      </body>
    </Html>
  )
}

// 🔧 自定义渲染方法
Document.getInitialProps = async (ctx) => {
  const initialProps = await ctx.defaultGetInitialProps(ctx)
  
  return {
    ...initialProps,
    // 添加自定义属性
    customMeta: 'AI项目平台',
    timestamp: new Date().toISOString()
  }
}

// 🔧 禁用静态优化以确保每次请求都执行
Document.unstable_getStaticProps = undefined