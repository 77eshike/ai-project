/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基础配置
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
  
  // 图片配置
  images: {
    domains: ['localhost', '127.0.0.1', '43.228.124.126', '191413.ai'],
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // 构建配置
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 🔧 修复：移除已弃用的 runtimeConfig
  // serverRuntimeConfig 和 publicRuntimeConfig 在 Next.js 15 中已弃用
  
  // 环境变量
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXTAUTH_URL || 'https://191413.ai',
    NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG || 'false',
  },
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/api',
        destination: '/api/health',
        permanent: false,
      },
    ];
  },
  
  // 🔧 修复：安全头配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // 🔧 修复：简化的 Webpack 配置
  webpack: (config, { isServer, dev }) => {
    // 客户端配置
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve('browserify-zlib'),
        // 🔧 移除：vm-browserify 可能不需要
        // vm: false,
      };
    }
    
    return config;
  },
  
  // 🔧 修复：编译器配置
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 🔧 修复：输出配置
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // 🔧 修复：压缩配置
  compress: true,
  
  // 🔧 修复：移除已弃用的 swcMinify（Next.js 15 默认启用）
  // swcMinify: true, // 已弃用，Next.js 15 默认启用
  
  // 🔧 新增：实验性功能
  experimental: {
    optimizeCss: true,
  },
};

// 🔧 优化：详细的配置日志
console.log('🔧 Next.js 配置 - 详细环境检查:', {
  环境: process.env.NODE_ENV,
  应用地址: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL,
  数据库: process.env.DATABASE_URL ? '已配置' : '未配置',
  认证密钥: process.env.NEXTAUTH_SECRET ? '已配置' : '未配置',
  API密钥: (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY) ? '已配置' : '未配置',
  调试模式: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
});

// 🔧 新增：环境变量验证
const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ 生产环境缺少必要环境变量:', missingEnvVars);
}

module.exports = nextConfig;