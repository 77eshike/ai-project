// middleware.js - 优化版本
import { NextResponse } from 'next/server';

// 🔧 优化：更精确的公开路径配置
function isPublicPath(pathname) {
  // 静态资源 - 完全跳过
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/static/') ||
      pathname.includes('.') || 
      pathname === '/favicon.ico' ||
      pathname === '/site.webmanifest') {
    return true;
  }
  
  // 🔧 优化：精确的公开路径匹配
  const publicPaths = [
    '/', 
    '/auth', '/auth/signin', '/auth/signup', '/auth/error',
    '/api/auth', '/api/health', '/api/debug',
    '/signup', '/register', '/login', '/signin'
  ];
  
  // 精确匹配或前缀匹配
  return publicPaths.some(publicPath => 
    pathname === publicPath || 
    pathname.startsWith(publicPath + '/')
  );
}

// 🔧 优化：需要保护的路径
function isProtectedPath(pathname) {
  const protectedPaths = [
    '/dashboard',
    '/api/ai/chat',
    '/api/user',
    '/api/conversation'
  ];
  
  return protectedPaths.some(protectedPath => 
    pathname === protectedPath || 
    pathname.startsWith(protectedPath + '/')
  );
}

export const config = {
  matcher: [
    // 🔧 优化：保护所有需要认证的路径
    '/dashboard/:path*',
    '/api/ai/:path*',
    '/api/user/:path*',
    '/api/conversation/:path*'
  ]
};

export async function middleware(request) {
  const { pathname, origin, search } = request.nextUrl;
  
  // 🔧 优化：减少日志输出，只在开发环境记录
  if (process.env.NODE_ENV === 'development') {
    console.log('🛡️ 中间件处理:', { path: pathname, method: request.method });
  }

  // 🔧 优化：先检查是否是公开路径
  if (isPublicPath(pathname)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 公开路径，直接放行:', pathname);
    }
    return NextResponse.next();
  }

  // 🔧 优化：只保护需要认证的路径
  if (!isProtectedPath(pathname)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 非保护路径，直接放行:', pathname);
    }
    return NextResponse.next();
  }

  try {
    // 🔧 优化：改进的 Cookie 检查
    const cookies = request.cookies;
    const hasSessionCookie = 
      cookies.get('next-auth.session-token')?.value ||
      cookies.get('__Secure-next-auth.session-token')?.value;
    
    if (!hasSessionCookie) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ 无会话Cookie，拒绝访问:', pathname);
      }
      
      // 🔧 优化：改进的重定向逻辑
      if (pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({ 
            error: '未经授权的访问',
            code: 'UNAUTHORIZED',
            message: '请先登录',
            redirectTo: '/auth/signin'
          }),
          { 
            status: 401,
            headers: { 
              'Content-Type': 'application/json',
              'X-Auth-Redirect': '/auth/signin'
            }
          }
        );
      } else {
        // 页面请求重定向到登录页
        const signInUrl = new URL('/auth/signin', origin);
        // 保留原始URL用于登录后重定向
        if (pathname !== '/') {
          signInUrl.searchParams.set('callbackUrl', pathname + search);
        }
        return NextResponse.redirect(signInUrl);
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 有会话Cookie，放行请求:', pathname);
    }
    
    // 🔧 优化：添加认证头信息
    const response = NextResponse.next();
    response.headers.set('X-Auth-Status', 'authenticated');
    return response;
    
  } catch (error) {
    console.error('❌ 中间件错误:', error);
    
    // 🔧 优化：出错时根据路径类型处理
    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: '服务器内部错误',
          code: 'MIDDLEWARE_ERROR'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 页面请求出错时放行
    console.log('⚠️ 中间件出错，放行页面请求');
    return NextResponse.next();
  }
}