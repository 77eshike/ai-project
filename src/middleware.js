// middleware.js - 修复版本
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export async function middleware(request) {
  const { pathname, origin } = request.nextUrl;
  
  console.log('🛡️ 中间件检查:', {
    pathname,
    method: request.method,
    hasCookies: !!request.headers.get('cookie')
  });

  // 公共路径 - 不需要认证
  const publicPaths = [
    '/',
    '/auth/signin',
    '/auth/signup', 
    '/auth/error',
    '/api/auth',
    '/api/public',
    '/api/health'
  ];

  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublicPath) {
    console.log('✅ 公共路径，直接放行');
    return NextResponse.next();
  }

  // 保护需要认证的路由
  const protectedPaths = [
    '/dashboard',
    '/chat', 
    '/projects',
    '/api/ai/',
    '/api/knowledge/',
    '/api/projects/'
  ];

  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  );

  if (isProtectedPath) {
    console.log('🔐 检查保护路径认证');
    
    try {
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: true
      });

      console.log('🔐 Token检查结果:', { 
        hasToken: !!token,
        userId: token?.sub
      });

      if (!token) {
        console.log('❌ 未认证用户访问保护路由');
        
        // 对于API请求，返回JSON错误
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ 
              success: false,
              error: '未经授权的访问',
              code: 'UNAUTHORIZED'
            }),
            { 
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        // 对于页面请求，重定向到登录页，但避免循环
        // 检查当前是否已经在认证页面
        if (!pathname.startsWith('/auth/')) {
          const signInUrl = new URL('/auth/signin', origin);
          console.log('🔀 重定向到登录页:', signInUrl.toString());
          return NextResponse.redirect(signInUrl);
        }
      }
      
      console.log('✅ 认证通过，放行请求');
      
    } catch (error) {
      console.error('❌ 中间件认证检查错误:', error);
      
      // 发生错误时，对于页面请求直接放行，避免循环
      if (!pathname.startsWith('/api/')) {
        console.log('⚠️ 认证检查出错，但放行页面请求');
        return NextResponse.next();
      }
      
      return new NextResponse(
        JSON.stringify({ 
          success: false,
          error: '认证检查失败'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  console.log('✅ 非保护路径，放行请求');
  return NextResponse.next();
}