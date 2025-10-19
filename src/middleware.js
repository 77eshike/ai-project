// middleware.js - 修复版本
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 重要：修复matcher配置，确保包含所有需要保护的路由
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api/auth (NextAuth API)
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico, sitemap.xml, robots.txt
     * - 公开文件
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export async function middleware(request) {
  const { pathname, origin } = request.nextUrl;
  
  console.log('🛡️ 中间件处理:', {
    pathname,
    origin,
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
    '/api/health',
    '/api/diagnose'
  ];

  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublicPath) {
    console.log('🛡️ 公共路径，跳过认证');
    return NextResponse.next();
  }

  // 保护需要认证的路由
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/chat') || 
      pathname.startsWith('/api/ai/') ||
      pathname.startsWith('/api/knowledge/')) {
    
    console.log('🔐 检查保护路由认证:', pathname);
    
    try {
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://')
      });
      
      console.log('🔐 Token检查结果:', { 
        hasToken: !!token,
        tokenUserId: token?.sub,
        tokenEmail: token?.email
      });

      if (!token) {
        console.log('❌ 未认证用户访问保护路由:', pathname);
        
        // 对于API请求，返回JSON错误
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ 
              success: false,
              error: '未经授权的访问',
              code: 'UNAUTHORIZED',
              sessionExpired: true 
            }),
            { 
              status: 401,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Credentials': 'true'
              }
            }
          );
        }
        
        // 对于页面请求，重定向到登录页
        const signInUrl = new URL('/auth/signin', origin);
        signInUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(signInUrl);
      }
      
      console.log('✅ 认证通过，用户ID:', token.sub);
      
    } catch (error) {
      console.error('❌ 中间件认证检查错误:', error);
      
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ 
            success: false,
            error: '认证检查失败',
            code: 'AUTH_CHECK_ERROR'
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      const signInUrl = new URL('/auth/signin', origin);
      signInUrl.searchParams.set('error', 'AuthError');
      return NextResponse.redirect(signInUrl);
    }
  }
  
  return NextResponse.next();
}