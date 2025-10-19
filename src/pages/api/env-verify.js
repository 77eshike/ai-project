// pages/api/env-verify.js - 环境验证API
export default async function handler(req, res) {
  const envCheck = {
    timestamp: new Date().toISOString(),
    loadedEnvironment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_NEXTAUTH_URL: process.env.NEXT_PUBLIC_NEXTAUTH_URL,
      PORT: process.env.PORT
    },
    requestInfo: {
      host: req.headers.host,
      origin: req.headers.origin,
      protocol: req.headers.host?.includes('localhost') ? 'https' : 'https'
    },
    issues: [],
    recommendations: []
  };

  // 检查环境一致性
  const expectedUrl = `https://${req.headers.host}`;
  if (process.env.NEXTAUTH_URL !== expectedUrl) {
    envCheck.issues.push(`❌ NEXTAUTH_URL不匹配: 配置为"${process.env.NEXTAUTH_URL}"，期望为"${expectedUrl}"`);
    envCheck.recommendations.push(`建议: 将NEXTAUTH_URL改为"${expectedUrl}"`);
  }

  if (process.env.NEXTAUTH_URL !== process.env.NEXT_PUBLIC_NEXTAUTH_URL) {
    envCheck.issues.push(`❌ NEXTAUTH_URL与NEXT_PUBLIC_NEXTAUTH_URL不一致`);
    envCheck.recommendations.push(`建议: 保持两个URL一致`);
  }

  // 检查环境文件
  envCheck.recommendations.push('检查: 确保.env和.env.development中的NEXTAUTH_URL一致');
  envCheck.recommendations.push('检查: 运行开发服务器时使用 npm run dev');

  console.log('🔧 环境验证结果:', envCheck);
  res.status(200).json(envCheck);
}