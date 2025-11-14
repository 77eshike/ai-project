import OpenAI from 'openai';

// 配置常量
const DEFAULT_CONFIG = {
  model: "deepseek-chat",
  max_tokens: 1500,
  temperature: 0.7,
  stream: false,
};

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
  timeout: 30000, // 添加超时设置
});

export async function chatWithGPT(messages, options = {}) {
  try {
    console.log('调用AI API，消息数量:', messages.length);
    
    const completion = await openai.chat.completions.create({
      ...DEFAULT_CONFIG,
      ...options,
      messages: messages,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('AI返回空响应');
    }

    console.log('AI响应成功，长度:', response.length);
    return response;

  } catch (error) {
    console.error('AI API错误:', error);
    
    // 更详细的错误处理
    if (error.code === 'insufficient_quota') {
      throw new Error('API额度不足，请检查账户余额');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('API密钥无效');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('请求频率过高，请稍后重试');
    } else if (error.code === 'context_length_exceeded') {
      throw new Error('对话内容过长，请简化问题');
    } else if (error.name === 'TimeoutError') {
      throw new Error('请求超时，请稍后重试');
    } else {
      throw new Error(`AI服务暂时不可用: ${error.message}`);
    }
  }
}

export async function validateOpenAIKey() {
  try {
    await openai.models.list();
    return { valid: true, message: 'API密钥有效' };
  } catch (error) {
    return { 
      valid: false, 
      message: `API密钥无效: ${error.message}`,
      errorCode: error.code 
    };
  }
}

// 新增函数：获取可用模型列表
export async function getAvailableModels() {
  try {
    const models = await openai.models.list();
    return models.data.map(model => model.id);
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
}