// lib/ai-service.js - 完整版本
import OpenAI from 'openai';

// 配置常量
const DEFAULT_CONFIG = {
  model: "deepseek-chat",
  max_tokens: 1500,
  temperature: 0.7,
  stream: false,
};

// AI 模式配置
export const AI_MODES = {
  general: {
    name: '通用助手',
    model: "deepseek-chat",
    max_tokens: 2000,
    temperature: 0.7,
  },
  creative: {
    name: '创意模式',
    model: "deepseek-chat",
    max_tokens: 2500,
    temperature: 0.9,
  },
  precise: {
    name: '精确模式', 
    model: "deepseek-chat",
    max_tokens: 1500,
    temperature: 0.3,
  },
  concise: {
    name: '简洁模式',
    model: "deepseek-chat", 
    max_tokens: 800,
    temperature: 0.5,
  }
};

// 初始化 OpenAI 客户端
let openai;

try {
  openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
    timeout: 30000,
    maxRetries: 2,
  });
} catch (error) {
  console.error('❌ 初始化OpenAI客户端失败:', error);
  throw new Error('AI服务配置错误');
}

/**
 * 与AI聊天
 */
export async function chatWithGPT(messages, options = {}) {
  try {
    console.log('🤖 调用AI API，消息数量:', messages.length);
    
    // 构建最终配置
    const config = {
      ...DEFAULT_CONFIG,
      ...options,
      messages: messages,
    };

    console.log('🔧 AI请求配置:', {
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      messageCount: messages.length
    });

    const completion = await openai.chat.completions.create(config);

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('AI返回空响应');
    }

    console.log('✅ AI响应成功，长度:', response.length);
    
    return {
      content: response,
      usage: completion.usage || null,
      model: completion.model,
      id: completion.id
    };

  } catch (error) {
    console.error('❌ AI API错误:', error);
    
    // 详细的错误处理
    let errorMessage = 'AI服务暂时不可用';
    
    if (error.code === 'insufficient_quota') {
      errorMessage = 'API额度不足，请检查账户余额';
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'API密钥无效或已过期';
    } else if (error.code === 'rate_limit_exceeded') {
      errorMessage = '请求频率过高，请稍后重试';
    } else if (error.code === 'context_length_exceeded') {
      errorMessage = '对话内容过长，请简化问题或开始新对话';
    } else if (error.name === 'TimeoutError' || error.code === 'timeout') {
      errorMessage = '请求超时，请稍后重试';
    } else if (error.code === 'network_error') {
      errorMessage = '网络连接错误，请检查网络状态';
    } else if (error.code === 'billing_not_setup') {
      errorMessage = '账户账单未设置，请检查账户状态';
    } else if (error.message) {
      errorMessage = `AI服务错误: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

/**
 * 流式聊天（用于实时输出）
 */
export async function chatWithGPTStream(messages, options = {}, onChunk = null) {
  try {
    console.log('🌊 流式AI请求，消息数量:', messages.length);

    const config = {
      ...DEFAULT_CONFIG,
      ...options,
      messages: messages,
      stream: true,
    };

    const stream = await openai.chat.completions.create(config);
    
    let fullContent = '';
    let chunkCount = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        chunkCount++;
        
        // 调用回调函数处理每个chunk
        if (onChunk && typeof onChunk === 'function') {
          onChunk(content, fullContent);
        }
      }
    }

    console.log(`✅ 流式响应完成，共 ${chunkCount} 个chunk，总长度: ${fullContent.length}`);
    
    return fullContent;

  } catch (error) {
    console.error('❌ 流式AI API错误:', error);
    throw new Error(`流式对话失败: ${error.message}`);
  }
}

/**
 * 验证API密钥
 */
export async function validateOpenAIKey() {
  try {
    const models = await openai.models.list();
    const isValid = Array.isArray(models.data);
    
    console.log('🔑 API密钥验证:', isValid ? '有效' : '无效');
    
    return { 
      valid: isValid, 
      message: isValid ? 'API密钥有效' : 'API密钥无效',
      models: isValid ? models.data.slice(0, 5).map(m => m.id) : [] // 返回前5个模型
    };
  } catch (error) {
    console.error('❌ API密钥验证失败:', error);
    return { 
      valid: false, 
      message: `API密钥无效: ${error.message}`,
      errorCode: error.code 
    };
  }
}

/**
 * 获取可用模型列表
 */
export async function getAvailableModels() {
  try {
    const models = await openai.models.list();
    const modelList = models.data.map(model => ({
      id: model.id,
      name: model.id,
      owned_by: model.owned_by || 'unknown'
    }));
    
    console.log(`📊 获取到 ${modelList.length} 个可用模型`);
    return modelList;
  } catch (error) {
    console.error('❌ 获取模型列表失败:', error);
    return [];
  }
}

/**
 * 获取特定模式的配置
 */
export function getModeConfig(mode) {
  return AI_MODES[mode] || AI_MODES.general;
}

/**
 * 构建对话消息历史
 */
export function buildMessageHistory(conversationHistory, userMessage, systemPrompt = null) {
  const messages = [];
  
  // 添加系统提示（如果有）
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  // 添加历史消息
  if (conversationHistory && conversationHistory.length > 0) {
    // 限制历史消息数量以避免token超限
    const recentHistory = conversationHistory.slice(-10); // 只取最近10条
    
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
  }
  
  // 添加当前用户消息
  messages.push({
    role: 'user',
    content: userMessage
  });
  
  return messages;
}

/**
 * 估算token数量（简单版本）
 */
export function estimateTokens(text) {
  if (!text) return 0;
  // 简单估算：中文字符算2个token，英文字符算1个token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return chineseChars * 2 + otherChars;
}

/**
 * 检查消息是否超长
 */
export function isMessageTooLong(messages, maxTokens = 4000) {
  const totalTokens = messages.reduce((sum, msg) => {
    return sum + estimateTokens(msg.content);
  }, 0);
  
  return totalTokens > maxTokens;
}

/**
 * 截断消息历史以避免超长
 */
export function truncateMessageHistory(messages, maxTokens = 4000) {
  let totalTokens = 0;
  const truncatedMessages = [];
  
  // 从最新消息开始添加（倒序）
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateTokens(message.content);
    
    if (totalTokens + messageTokens > maxTokens) {
      break;
    }
    
    truncatedMessages.unshift(message); // 添加到开头
    totalTokens += messageTokens;
  }
  
  console.log(`✂️ 消息历史截断: ${messages.length} -> ${truncatedMessages.length} 条消息`);
  return truncatedMessages;
}

/**
 * 内容分类功能（使用AI对内容进行分类）
 */
export async function categorizeContent(content) {
  // 只对较长的内容进行分类
  if (!content || content.length < 20) {
    return '其他';
  }

  try {
    const response = await chatWithGPT([
      {
        role: "system",
        content: "你是一个内容分类助手。请将用户提供的内容分类到以下类别之一: 技术, 产品, 设计, 运营, 市场, 其他。只返回类别名称，不要解释。"
      },
      {
        role: "user",
        content: `请对以下内容进行分类:\n\n${content.substring(0, 500)}` // 限制长度
      }
    ], {
      max_tokens: 10,
      temperature: 0.1,
    });

    const category = response.content.trim();
    const validCategories = ['技术', '产品', '设计', '运营', '市场', '其他'];
    
    return validCategories.includes(category) ? category : '其他';
  } catch (error) {
    console.error('AI分类错误:', error);
    return '其他';
  }
}

/**
 * 文本摘要功能
 */
export async function summarizeText(text, maxLength = 200) {
  if (!text || text.length < 50) {
    return text; // 太短不需要摘要
  }

  try {
    const response = await chatWithGPT([
      {
        role: "system",
        content: `你是一个文本摘要助手。请用不超过 ${maxLength} 字总结用户提供的内容，保留关键信息。`
      },
      {
        role: "user", 
        content: `请总结以下内容:\n\n${text.substring(0, 2000)}` // 限制输入长度
      }
    ], {
      max_tokens: Math.floor(maxLength * 1.2), // 稍微多给一些token
      temperature: 0.3,
    });

    return response.content.trim();
  } catch (error) {
    console.error('文本摘要错误:', error);
    // 如果AI摘要失败，返回简单截断
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

// 导出默认实例
export default openai;