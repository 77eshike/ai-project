// pages/api/debug/chat-diagnosis.js
export default async function handler(req, res) {
  console.log('🔍 聊天功能诊断');
  
  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {}
  };

  try {
    // 1. 检查环境变量
    diagnosis.services.envVars = {
      openaiKey: !!process.env.OPENAI_API_KEY,
      openaiBaseUrl: !!process.env.OPENAI_BASE_URL,
      nextauthUrl: !!process.env.NEXTAUTH_URL,
      databaseUrl: !!process.env.DATABASE_URL
    };

    // 2. 测试 DeepSeek API
    const testMessage = 'Hello, this is a test message';
    const apiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: testMessage }],
        max_tokens: 100
      })
    });

    diagnosis.services.deepseekApi = {
      status: apiResponse.status,
      ok: apiResponse.ok
    };

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      diagnosis.services.deepseekApi.response = {
        hasReply: !!data.choices?.[0]?.message?.content,
        tokenUsage: data.usage
      };
    } else {
      diagnosis.services.deepseekApi.error = await apiResponse.text();
    }

    // 3. 检查数据库连接（简化版）
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      diagnosis.services.database = { status: 'connected' };
      await prisma.$disconnect();
    } catch (dbError) {
      diagnosis.services.database = { 
        status: 'error', 
        error: dbError.message 
      };
    }

    res.status(200).json({
      success: true,
      diagnosis: diagnosis
    });

  } catch (error) {
    console.error('❌ 诊断失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      diagnosis: diagnosis
    });
  }
}