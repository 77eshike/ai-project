// src/pages/api/check-env.js
export default function handler(req, res) {
  // 安全地检查环境变量状态（不暴露实际值）
  res.status(200).json({
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    },
    baidu: {
      apiKey: process.env.BAIDU_API_KEY ? '✅ 已设置' : '❌ 未设置',
      secretKey: process.env.BAIDU_SECRET_KEY ? '✅ 已设置' : '❌ 未设置',
      apiKeyLength: process.env.BAIDU_API_KEY ? process.env.BAIDU_API_KEY.length : 0,
      secretKeyLength: process.env.BAIDU_SECRET_KEY ? process.env.BAIDU_SECRET_KEY.length : 0
    },
    otherVars: {
      openaiKey: process.env.OPENAI_API_KEY ? '✅ 已设置' : '❌ 未设置',
      nextauthUrl: process.env.NEXTAUTH_URL ? '✅ 已设置' : '❌ 未设置'
    }
  });
}