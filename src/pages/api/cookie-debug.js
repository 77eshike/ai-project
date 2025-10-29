// pages/api/cookie-debug.js - Cookie诊断API
export default async function handler(req, res) {
  console.log('🍪 Cookie诊断开始');
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    request: {
      url: req.url,
      method: req.method,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        cookie: req.headers.cookie || '无Cookie'
      }
    },
    environment: {
      node_env: process.env.NODE_ENV,
      nextauth_url: process.env.NEXTAUTH_URL,
      is_https: req.headers.host?.includes('localhost') ? false : true
    },
    cookies: {}
  };

  // 分析Cookie
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim());
    debugInfo.cookies = {
      count: cookies.length,
      list: cookies,
      hasNextAuth: cookies.some(c => c.includes('next-auth')),
      nextAuthCookies: cookies.filter(c => c.includes('next-auth'))
    };
  }

  // 设置测试Cookie
  res.setHeader('Set-Cookie', [
    `test-cookie-debug=hello-world; Path=/; HttpOnly; SameSite=Lax`,
    `test-cookie-secure=secure-test; Path=/; HttpOnly; SameSite=None; Secure`
  ]);

  console.log('🍪 Cookie诊断结果:', debugInfo);
  res.status(200).json(debugInfo);
}