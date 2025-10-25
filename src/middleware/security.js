// src/middleware/security.js - 修复版本
import { NextResponse } from 'next/server';

// 常见恶意路径模式
const MALICIOUS_PATTERNS = [
  /\.env$/,
  /\.git(\/|$)/,
  /\.htaccess$/,
  /\.asp$/,
  /\.php$/,
  /\.jsp$/,
  /\.aspx$/,
  /\/phpinfo$/,
  /\/config\.json$/,
  /\/config\.js$/,
  /\/package\.json$/,
  /\/admin(\/|$)/,
  /\/wp-admin(\/|$)/,
  /\/wp-login(\/|$)/,
  /\/\.well-known(\/|$)/,
  /\/backup(\/|$)/,
  /\/database(\/|$)/,
  /\/sql(\/|$)/,
  /\/debug(\/|$)/,
  /\/test(\/|$)/,
];

// 需要特殊处理的 API 路由
const SENSITIVE_API_ROUTES = [
  '/api/auth/',
  '/api/admin/',
  '/api/user/',
  '/api/payment/',
];

// 公开 API 路由（不需要严格安全检查）
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/robots.txt',
  '/api/sitemap.xml',
];

// 简单的内存速率限制
const rateLimitMap = new Map();

function checkRateLimit(ip, key, windowMs = 60000, max = 100) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const rateKey = `${ip}:${key}`;
  
  if (!rateLimitMap.has(rateKey)) {
    rateLimitMap.set(rateKey, []);
  }
  
  const requests = rateLimitMap.get(rateKey).filter(time => time > windowStart);
  rateLimitMap.set(rateKey, requests);
  
  if (requests.length >= max) {
    return { 
      limited: true, 
      remaining: 0, 
      retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000) 
    };
  }
  
  requests.push(now);
  return { 
    limited: false, 
    remaining: max - requests.length, 
    retryAfter: 0 
  };
}

// 定期清理过期的速率限制记录
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(time => now - time < 60000);
    if (validRequests.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, validRequests);
    }
  }
}, 60000);

export async function securityMiddleware(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const method = request.method;
  
  // 开发环境日志
  if (process.env.NODE_ENV === 'development') {
    console.log('🛡️ 安全中间件:', { 
      pathname, 
      method, 
      ip: ip.substring(0, 15)
    });
  }
  
  // 检查是否是恶意请求
  const isMaliciousPath = MALICIOUS_PATTERNS.some(pattern => pattern.test(pathname));
  
  if (isMaliciousPath) {
    console.log(`🚫 阻止恶意请求: ${pathname}`, {
      ip,
      method,
      timestamp: new Date().toISOString()
    });
    
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // API 路由特殊处理
  if (pathname.startsWith('/api/')) {
    return handleApiRoute(request, pathname, ip, method);
  }
  
  // 静态资源处理
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
    return handleStaticResource(request);
  }
  
  // 普通页面路由
  return handlePageRoute(request, pathname, ip, method);
}

// 处理 API 路由
function handleApiRoute(request, pathname, ip, method) {
  const response = NextResponse.next();
  
  // 为所有 API 路由添加基本安全头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  
  // 检查是否是敏感 API 路由
  const isSensitiveApi = SENSITIVE_API_ROUTES.some(route => pathname.startsWith(route));
  const isPublicApi = PUBLIC_API_ROUTES.some(route => pathname === route);
  
  if (isSensitiveApi) {
    // 对敏感 API 应用速率限制
    const rateLimitResult = checkRateLimit(ip, `api-sensitive-${pathname}`, 15 * 60 * 1000, 100);
    
    if (rateLimitResult.limited) {
      console.log(`🚫 敏感API速率限制触发: ${pathname}`, { ip });
      return new NextResponse(JSON.stringify({ 
        error: '请求过于频繁，请稍后重试',
        retryAfter: rateLimitResult.retryAfter 
      }), { 
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter.toString()
        }
      });
    }
    
  } else if (!isPublicApi) {
    // 普通 API 路由速率限制
    const rateLimitResult = checkRateLimit(ip, `api-${pathname}`, 60 * 1000, 60);
    
    if (rateLimitResult.limited) {
      console.log(`🚫 API速率限制触发: ${pathname}`, { ip });
      return new NextResponse(JSON.stringify({ 
        error: '请求过于频繁' 
      }), { 
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter.toString()
        }
      });
    }
  }
  
  // CORS 配置
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
  
  // 预检请求处理
  if (method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: Object.fromEntries(response.headers)
    });
  }
  
  return response;
}

// 处理静态资源
function handleStaticResource(request) {
  const response = NextResponse.next();
  
  // 静态资源缓存策略
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

// 处理页面路由
function handlePageRoute(request, pathname, ip, method) {
  // 对页面路由应用速率限制
  const rateLimitResult = checkRateLimit(ip, `page-${pathname}`, 60 * 1000, 120);
  
  if (rateLimitResult.limited) {
    console.log(`🚫 页面路由速率限制触发: ${pathname}`, { ip });
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter.toString()
      }
    });
  }
  
  const response = NextResponse.next();
  
  // 完整的安全头设置
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // 生产环境添加 HSTS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // 缓存控制
  if (pathname === '/' || pathname.startsWith('/auth/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=300');
  }
  
  return response;
}