// pages/api/auth-status.js
export default function handler(req, res) {
  console.log('🔐 Auth status check');
  
  const result = {
    timestamp: new Date().toISOString(),
    authSystem: {
      status: 'checking',
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV
    },
    request: {
      method: req.method,
      url: req.url,
      headers: {
        cookie: req.headers.cookie ? '存在' : '不存在'
      }
    },
    recommendations: []
  };

  if (!process.env.NEXTAUTH_SECRET) {
    result.authSystem.status = 'misconfigured';
    result.recommendations.push('设置 NEXTAUTH_SECRET 环境变量');
  } else {
    result.authSystem.status = 'configured';
  }

  console.log('🔐 Auth status result:', result);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.status(200).json(result);
}