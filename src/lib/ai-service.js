// lib/ai-service.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function categorizeContent(content) {
  // 只对较长的内容进行分类
  if (content.length < 50) {
    return '其他';
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "你是一个内容分类助手。请将用户提供的内容分类到以下类别之一: 技术, 产品, 设计, 运营, 市场, 其他。只返回类别名称，不要解释。"
        },
        {
          role: "user",
          content: `请对以下内容进行分类:\n\n${content.substring(0, 1000)}` // 限制长度
        }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const category = response.choices[0].message.content.trim();
    const validCategories = ['技术', '产品', '设计', '运营', '市场', '其他'];
    
    return validCategories.includes(category) ? category : '其他';
  } catch (error) {
    console.error('AI分类错误:', error);
    return '其他';
  }
}