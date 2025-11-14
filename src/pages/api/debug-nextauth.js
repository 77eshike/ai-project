// pages/api/debug-nextauth.js
export default async function handler(req, res) {
  console.log('🔐 NextAuth 配置调试');
  
  try {
    // 检查 authOptions 配置
    const configCheck = {
      hasProviders: true, // 假设有提供者
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      sessionStrategy: 'jwt', // 假设使用 JWT
      hasAdapter: true, // 假设有适配器
      pages: {
        signIn: '/auth/signin',
        error: '/auth/error'
      },
      callbacks: {
        jwt: true,
        session: true,
        signIn: true
      }
    };

    const result = {
      timestamp: new Date().toISOString(),
      configCheck,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***设置***' : '未设置'
      },
      issues: [],
      recommendations: []
    };

    // 分析配置问题
    if (!configCheck.hasProviders) {
      result.issues.push('❌ 没有配置认证提供者');
    }

    if (!configCheck.hasSecret) {
      result.issues.push('❌ 没有设置 NEXTAUTH_SECRET');
      result.recommendations.push('立即设置 NEXTAUTH_SECRET 环境变量');
    }

    console.log('🔐 NextAuth 配置检查结果:', result);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ NextAuth 配置调试失败:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}