export default async function handler(req, res) {
  // 只返回环境变量状态，不暴露具体值
  const envStatus = {
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    hasAllRequired: !!(process.env.NEXTAUTH_SECRET && process.env.DATABASE_URL && process.env.DEEPSEEK_API_KEY)
  }
  
  res.status(200).json({
    success: true,
    data: envStatus,
    message: '环境变量检查完成'
  })
}
