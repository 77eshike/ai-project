// next.config.js - 优化版本
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基础配置
  reactStrictMode: process.env.NODE_ENV === 'production',
  poweredByHeader: false,
  generateEtags: false,
  
  // 构建配置优化
  generateBuildId: async () => {
    if (process.env.CI_COMMIT_SHA) {
      return process.env.CI_COMMIT_SHA.slice(0, 12);
    }
    
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
    }
    
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse --short HEAD').toString().trim();
    } catch (error) {
      console.log('⚠️ 无法获取 Git commit，使用时间戳作为构建ID');
      return `build-${Date.now().toString(36)}`;
    }
  },
  
  // 压缩和优化
  compress: true,
  
  // 图片配置优化
  images: {
    domains: [
      'localhost',
      '127.0.0.1',
      '191413.ai',
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
    BUILD_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || process.env.CI_COMMIT_SHA || new Date().toISOString(),
    BUILD_TIME: new Date().toISOString(),
    APP_ENV: process.env.NODE_ENV || 'development',
  },
  
  // Webpack 配置优化
  webpack: (config, { dev, isServer, webpack, buildId }) => {
    // 添加构建ID到环境变量
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_BUILD_ID': JSON.stringify(buildId),
      })
    );

    // 生产环境优化
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        chunkIds: 'deterministic',
        moduleIds: 'deterministic',
        minimize: true,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // React 相关库单独打包
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              chunks: 'all',
              priority: 20,
            },
            // UI 库单独打包
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/](@headlessui|@heroicons)[\\/]/,
              chunks: 'all',
              priority: 15,
            },
            // 工具库
            utils: {
              name: 'utils',
              test: /[\\/]node_modules[\\/](lodash|date-fns|axios)[\\/]/,
              chunks: 'all',
              priority: 10,
            },
            // 公共模块
            commons: {
              name: 'commons',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            },
          },
        },
      };
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

    // 开发环境优化
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    return config;
  },
  
  // ESLint 和 TypeScript 配置
  eslint: {
    ignoreDuringBuilds: !!process.env.IGNORE_ESLINT,
    dirs: ['pages', 'components', 'lib', 'contexts', 'hooks', 'utils'],
  },
  
  typescript: {
    ignoreBuildErrors: !!process.env.IGNORE_TSC,
    tsconfigPath: './tsconfig.json',
  },
  
  // 编译器配置优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    styledComponents: {
      ssr: true,
      displayName: process.env.NODE_ENV === 'development',
      pure: true,
    },
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? {
      properties: ['^data-testid$'],
    } : false,
  },
  
  // 安全头配置优化
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    
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
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=(), fullscreen=(self)'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Strict-Transport-Security',
        value: isProduction 
          ? 'max-age=31536000; includeSubDomains; preload'
          : 'max-age=0; includeSubDomains'
      },
      {
        key: 'X-Permitted-Cross-Domain-Policies',
        value: 'none'
      },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: isDevelopment ? 'unsafe-none' : 'require-corp'
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin'
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin'
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
    ];
    
    // 动态CSP配置 - 支持所有必要的服务
    const cspHeader = {
      key: 'Content-Security-Policy',
      value: isDevelopment
        ? [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self'",
            "connect-src 'self' https://api.deepseek.com https://openapi.baidu.com https://vop.baidu.com ws: wss:",
            "media-src 'self' blob: data:",
            "worker-src 'self' blob:",
            "child-src 'self' blob:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join('; ')
        : [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self'",
            "connect-src 'self' https://api.deepseek.com https://openapi.baidu.com https://vop.baidu.com",
            "media-src 'self' blob: data:",
            "worker-src 'self' blob:",
            "child-src 'self' blob:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests"
          ].join('; ')
    };
    
    securityHeaders.push(cspHeader);
    
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
            value: isDevelopment 
              ? process.env.NEXTAUTH_URL || 'http://localhost:3001'
              : 'https://191413.ai'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS, HEAD'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, X-API-Key'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'X-API-Version',
            value: '1.0'
          },
        ],
      },
      // 静态资源缓存策略
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*).(ico|png|jpg|jpeg|gif|webp|avif|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
  
  // 重定向配置增强
  async redirects() {
    return [
      {
        source: '/.env',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/robots.txt',
        destination: '/api/robots',
        permanent: false,
      },
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
        permanent: false,
      },
      {
        source: '/.git',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/wp-admin',
        destination: '/404',
        permanent: false,
      },
    ];
  },
  
  // 重写配置 - 用于API代理或路径别名
  async rewrites() {
    return [
      {
        source: '/api/knowledge/:path*',
        destination: '/api/knowledge/:path*',
      },
      {
        source: '/api/chat/:path*',
        destination: '/api/chat/:path*',
      },
    ];
  },
  
  // 输出配置
  trailingSlash: true,
  cleanDistDir: true,
  
  // 实验性功能优化
  experimental: {
    esmExternals: true,
    externalDir: true,
    optimizeCss: process.env.NODE_ENV === 'production',
    scrollRestoration: true,
    optimizePackageImports: ['lucide-react', '@heroicons/react'],
  },
};

// 环境特定配置
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}