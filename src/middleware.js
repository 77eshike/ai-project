// middleware.js - 完整修复版本
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimit } from './middleware/rate-limit';

// 路径配置
const PATH_CONFIG = {
  // 公开路径（不需要认证）
  public: [
    /^\/$/,
    /^\/auth\/(signin|signup|error|logout)(\/.*)?$/,
    /^\/api\/(auth|public|health)(\/.*)?$/,
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/,
    /^\/_next\//,
    /^\/sitemap\.xml$/,
    /^\/robots\.txt$/
  ],
  
  // 保护路径（需要认证）
  protected: [
    /^\/dashboard(\/.*)?$/,
    /^\/chat(\/.*)?$/,
    /^\/projects(\/.*)?$/,
    /^\/api\/(ai|knowledge|projects)(\/.*)?$/
  ]
};

// 恶意路径模式
const MALICIOUS_PATTERNS = [
  /\.env$/,
  /\.git(\/|$)/,
  /\.htaccess$/,
  /\.(asp|php|jsp|aspx)$/,
  /\/phpinfo$/,
  /\/config\.(json|js)$/,
  /\/package\.json$/,
  /\/(admin|wp-admin|wp-login)(\/|$)/,
  /\/\.well-known(\/|$)/,
  /\/(backup|database|sql|debug|test)(\/|$)/
];

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function middleware(request) {
  const { pathname, origin, searchParams } = request.nextUrl;
  
  console.log(`🛡️ 中间件处理: ${pathname}`, {
    hasLogoutParam: searchParams.has('logout'),
    method: request.method
  });
  
  // 🔧 关键修复：在认证检查之前特殊处理登出后的登录页面
  if (pathname.startsWith('/auth/signin') && searchParams.has('logout')) {
    console.log('🔓 检测到登出后的登录页面访问，强制允许');
    
    // 创建响应
    const response = NextResponse.next();
    
    // 设置安全头
    setSecurityHeaders(response, request, pathname);
    
    // 添加自定义头标识
    response.headers.set('X-Auth-Status', 'post-logout');
    
    return response;
  }
  
  // 1. 安全检查
  const securityCheck = await checkSecurity(request, pathname);
  if (securityCheck) return securityCheck;
  
  // 2. 速率限制
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult.limited) {
    return createRateLimitResponse(rateLimitResult, pathname);
  }
  
  // 3. 认证检查
  const authCheck = await checkAuthentication(request, pathname, origin);
  if (authCheck) return authCheck;
  
  // 4. 安全头设置
  const response = authCheck || NextResponse.next();
  return setSecurityHeaders(response, request, pathname);
}

// 认证检查 - 修复版本
async function checkAuthentication(request, pathname, origin) {
  const isPublicPath = PATH_CONFIG.public.some(pattern => pattern.test(pathname));
  const isProtectedPath = PATH_CONFIG.protected.some(pattern => pattern.test(pathname));
  
  // 🔧 关键修复：永远允许访问认证相关页面
  if (pathname.startsWith('/auth/')) {
    console.log(`✅ 允许访问认证页面: ${pathname}`);
    return null;
  }
  
  // 如果是公开路径，直接放行
  if (isPublicPath) {
    return null;
  }
  
  // 如果是非保护路径，也放行
  if (!isProtectedPath) {
    return null;
  }
  
  console.log(`🔐 检查保护路径认证: ${pathname}`);
  
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    });
    
    console.log(`🔍 Token检查:`, {
      hasToken: !!token,
      tokenExp: token?.exp,
      currentTime: Math.floor(Date.now() / 1000),
      isExpired: token?.exp ? token.exp < Math.floor(Date.now() / 1000) : 'unknown'
    });
    
    // 如果没有token，重定向到登录页
    if (!token) {
      console.log(`🚫 无有效token，重定向到登录页`);
      return handleUnauthorized(request, pathname, origin);
    }
    
    // 检查token是否过期
    const currentTime = Math.floor(Date.now() / 1000);
    const isTokenExpired = token.exp && (token.exp < currentTime);
    
    if (isTokenExpired) {
      console.log(`⌛ Token已过期，重定向到登录页`);
      return handleUnauthorized(request, pathname, origin);
    }
    
    console.log(`✅ 认证通过: ${pathname}`);
    
    // 有有效token且访问保护路径，允许访问
    return null;
    
  } catch (error) {
    console.error('❌ 认证检查错误:', error);
    return handleAuthError(error, pathname);
  }
}

// 设置安全头
function setSecurityHeaders(response, request, pathname) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  if (pathname.startsWith('/api/')) {
    setApiHeaders(response, request);
  }
  
  if (pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// API 头设置
function setApiHeaders(response, request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3001']
    : ['https://191413.ai'];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: Object.fromEntries(response.headers)
    });
  }
}

// 工具函数
function getClientIP(request) {
  return request.ip || 
         request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function isSuspiciousUserAgent(userAgent) {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /scanner/i,
    /nikto/i,
    /sqlmap/i,
    /metasploit/i
  ];
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

async function checkSecurity(request, pathname) {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = getClientIP(request);
  
  const isMaliciousPath = MALICIOUS_PATTERNS.some(pattern => pattern.test(pathname));
  if (isMaliciousPath) {
    console.log(`🚫 阻止恶意请求: ${pathname}`, { ip });
    return new NextResponse('Not Found', { status: 404 });
  }
  
  if (isSuspiciousUserAgent(userAgent)) {
    console.log(`🚫 可疑用户代理: ${userAgent.substring(0, 100)}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  return null;
}

function handleUnauthorized(request, pathname, origin) {
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
  
  const signInUrl = new URL('/auth/signin', origin);
  signInUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(signInUrl);
}

function handleAuthError(error, pathname) {
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  return new NextResponse(
    JSON.stringify({ 
      success: false,
      error: '认证检查失败',
      code: 'AUTH_ERROR'
    }),
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

function createRateLimitResponse(rateLimitResult, pathname) {
  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({
        error: '请求过于频繁，请稍后重试',
        retryAfter: rateLimitResult.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitResult.max?.toString() || '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || ''
        }
      }
    );
  }
  
  return new NextResponse('Too Many Requests', {
    status: 429,
    headers: {
      'Retry-After': rateLimitResult.retryAfter.toString()
    }
  });
}