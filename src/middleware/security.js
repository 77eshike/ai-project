// middleware/security.js - 更新版本
import { NextResponse } from 'next/server';
import { rateLimit } from './rate-limit';

// 常见恶意路径模式
const MALICIOUS_PATTERNS = [
  /\.env$/,
  /\.git$/,
  /\.htaccess$/,
  /\.asp$/,
  /\.php$/,
  /\/phpinfo$/,
  /\/sendgrid$/,
  /\/twilio$/,
  /\/config\.json$/,
  /\/admin$/,
  /\/wp-admin$/,
  /\/wp-login$/,
  /\/\.well-known/,
];

// 已知恶意用户代理
const MALICIOUS_USER_AGENTS = [
  /More Firefox/,
  /Sprint:/,
  /compatible; MSIE/,
];

export async function securityMiddleware(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  console.log('🛡️ 安全中间件 - 处理请求:', pathname);
  
  // 重要：对于API路由，使用更宽松的安全策略
  if (pathname.startsWith('/api/')) {
    console.log('🛡️ 安全中间件 - 跳过API路由安全检查');
    
    // 只为API路由添加基本安全头，不进行恶意请求检查和速率限制
    const response = NextResponse.next();
    
    // 基本安全头
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    return response;
  }
  
  // 检查是否是恶意请求（仅对非API路由）
  const isMaliciousPath = MALICIOUS_PATTERNS.some(pattern => pattern.test(pathname));
  const isMaliciousUA = MALICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent));
  
  if (isMaliciousPath || isMaliciousUA) {
    // 记录恶意请求
    console.log(`🚫 阻止恶意请求: ${pathname}`, {
      userAgent: userAgent.substring(0, 100),
      ip,
      timestamp: new Date().toISOString(),
      type: isMaliciousPath ? '恶意路径' : '恶意UA'
    });
    
    // 返回404或重定向到首页
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // 速率限制（仅对非API路由）
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult && rateLimitResult.limited) {
      console.log(`🚫 速率限制触发: ${pathname}`, { ip });
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  } catch (error) {
    console.error('速率限制错误:', error);
    // 如果速率限制出错，继续处理请求
  }
  
  // 为非API路由添加完整安全头
  const response = NextResponse.next();
  
  // 安全头信息
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 对于HTTPS环境，添加HSTS
  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}