/** @type {import('next').NextConfig} */
const nextConfig = {
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
  
  // 安全头配置
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
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Webpack 配置优化
  webpack: (config, { dev, isServer, webpack }) => {
    // 添加构建ID到环境变量
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_TIMESTAMP': JSON.stringify(Date.now()),
        'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify(process.env.NEXTAUTH_URL || 'http://43.228.124.126'),
        'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY || ''),
        'process.env.NEXTAUTH_SECRET': JSON.stringify(process.env.NEXTAUTH_SECRET || ''),
      })
    );

    // 生产环境检查必需变量
    if (!dev && isServer) {
      const requiredEnvVars = ['OPENAI_API_KEY', 'NEXTAUTH_SECRET', 'DATABASE_URL'];
      const missing = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missing.length > 0) {
        throw new Error(`缺少必需环境变量: ${missing.join(', ')}`);
      }
    }

    // 模块解析优化
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
      }
    };

    return config;
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 实验性功能
  experimental: {
    optimizeCss: true,
  }
}

module.exports = nextConfig