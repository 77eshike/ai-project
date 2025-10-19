// verify-key.js
const { OpenAI } = require('openai');

async function verifyKey() {
  console.log('验证 API 密钥...');
  console.log('密钥前缀:', process.env.DEEPSEEK_API_KEY.substring(0, 10));
  
  // 测试作为 OpenAI 密钥
  console.log('\n1. 测试作为 OpenAI 密钥:');
  try {
    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.openai.com/v1'
    });
    const models = await openai.models.list();
    console.log('✅ 这是有效的 OpenAI 密钥');
  } catch (error) {
    console.log('❌ 不是有效的 OpenAI 密钥:', error.message);
  }
  
  // 测试作为 DeepSeek 密钥
  console.log('\n2. 测试作为 DeepSeek 密钥:');
  try {
    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1'
    });
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "你好" }],
      max_tokens: 10
    });
    console.log('✅ 这是有效的 DeepSeek 密钥');
  } catch (error) {
    console.log('❌ 不是有效的 DeepSeek 密钥:', error.message);
  }
}

verifyKey();