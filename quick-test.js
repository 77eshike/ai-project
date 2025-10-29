// quick-test.js
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

async function test() {
  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "测试" }],
      max_tokens: 10
    });
    console.log('✅ 配置成功！');
  } catch (error) {
    console.log('❌ 配置失败:', error.message);
  }
}

test();