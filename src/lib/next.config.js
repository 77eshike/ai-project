/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
  
  images: {
    domains: ['localhost', '127.0.0.1', '43.228.124.126', '191413.ai'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXTAUTH_URL || 'https://191413.ai',
  },
  
  // 🔧 关键修复：禁用服务器端 source maps
  productionBrowserSourceMaps: false,
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // 🔧 关键修复：优化构建
    config.optimization = {
      ...config.optimization,
      minimize: true,
    }
    
    return config
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,
  },
  
  // 🔧 关键修复：禁用实验性功能
  experimental: {
    optimizeCss: false, // 暂时禁用
  },
}

console.log('🔧 Next.js 配置加载完成')

module.exports = nextConfig