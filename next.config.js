// next.config.js - Next.js 15.5.6 兼容版本
/** @type {import('next').NextConfig} */

const nextConfig = {
  // 基础配置
  reactStrictMode: false,
  poweredByHeader: false,
  generateEtags: false,
  
  // 构建配置优化
  generateBuildId: async () => {
    return `build-${Date.now().toString(36)}`;
  },
  
  // 压缩和优化
  compress: true,
  
  // 图片配置优化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.191413.ai',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: '43.228.124.126',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // 环境变量增强
  env: {
    BUILD_VERSION: new Date().toISOString(),
    BUILD_TIME: new Date().toISOString(),
    APP_ENV: process.env.NODE_ENV || 'development',
    APP_NAME: '191413AI平台',
  },
  
  // Webpack 配置优化
  webpack: (config, { dev, isServer, webpack }) => {
    // 添加构建ID到环境变量
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_TIMESTAMP': JSON.stringify(Date.now()),
        'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify(process.env.NEXTAUTH_URL || 'http://43.228.124.126'),
      })
    );

    // 开发环境特定配置
    if (dev) {
      // 忽略开发环境警告
      config.ignoreWarnings = [
        { module: /middleware/ },
        { module: /_devMiddlewareManifest/ },
        { module: /_devPagesManifest/ },
        { file: /node_modules\/@next\/react-dev-overlay/ },
        { message: /Module not found/ },
        { message: /Can't resolve/ },
      ];
    }

    // 模块解析优化
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        'react-native$': 'react-native-web',
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.mdx'],
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
      }
    };

    // 处理 Prisma 客户端
    if (isServer) {
      config.externals.push('@prisma/client');
    }

    return config;
  },
  
  // ESLint 和 TypeScript 配置
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 编译器配置优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 🔧 关键修复：CORS 配置支持反向代理
  async headers() {
    const securityHeaders = [
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
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
    ];
    
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' 
              ? 'http://localhost:3001' 
              : 'http://43.228.124.126'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Cookie'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          },
        ],
      },
      // NextAuth 特定路由
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' 
              ? 'http://localhost:3001' 
              : 'http://43.228.124.126'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Cookie'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
        ],
      },
    ];
  },
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/.env',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/.git',
        destination: '/404',
        permanent: false,
      },
    ];
  },
  
  // 输出配置
  trailingSlash: false,
  cleanDistDir: true,
  
  // 实验性配置
  experimental: {
    optimizeCss: process.env.NODE_ENV === 'production',
  },

  // 外部包配置
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

module.exports = nextConfig;