// verify-key-fixed.js
require('dotenv').config({ path: '.env.development' }); // 加载环境变量

const { OpenAI } = require('openai');

async function verifyKey() {
  console.log('验证 API 密钥...');
  
  // 检查环境变量是否加载
  console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? `已设置 (前10位: ${process.env.DEEPSEEK_API_KEY.substring(0, 10)}...)` : '未设置');
  console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || '未设置');
  
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('❌ DEEPSEEK_API_KEY 环境变量未设置');
    return;
  }

  // 测试作为 DeepSeek 密钥
  console.log('\n1. 测试作为 DeepSeek 密钥:');
  try {
    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1'
    });
    
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "你好" }],
      max_tokens: 10
    });
    
    console.log('✅ DeepSeek 密钥有效！');
    console.log('回复:', completion.choices[0].message.content);
    
  } catch (error) {
    console.log('❌ DeepSeek 密钥测试失败:');
    console.log('错误信息:', error.message);
    console.log('错误代码:', error.code);
    
    if (error.code === 'invalid_api_key') {
      console.log('🔑 密钥无效或格式错误');
    } else if (error.code === 'insufficient_quota') {
      console.log('💳 账户余额不足');
    }
  }

  // 测试作为 OpenAI 密钥（对比测试）
  console.log('\n2. 对比测试：作为 OpenAI 密钥:');
  try {
    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.openai.com/v1' // 强制使用 OpenAI 端点
    });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10
    });
    
    console.log('✅ 该密钥也是有效的 OpenAI 密钥');
    
  } catch (error) {
    console.log('❌ 不是有效的 OpenAI 密钥:', error.message);
  }
}

verifyKey();