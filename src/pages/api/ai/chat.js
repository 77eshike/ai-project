// pages/api/ai/chat.js - 修复导入版本
import { getCurrentUser } from '../../../lib/session';
import { getPrisma } from '../../../lib/prisma';
import { AI_MODES } from '../../../lib/ai-modes';
// 修复导入：使用默认导入而不是命名导入
import CommandProcessor from '../../../lib/command-processor';

export default async function handler(req, res) {
  console.log('🔐 AI聊天API - 开始处理请求', {
    method: req.method,
    url: req.url,
    hasCookies: !!req.headers.cookie,
    timestamp: new Date().toISOString()
  });
  
  // 设置更长的超时时间（2分钟）
  res.setTimeout(120000, () => {
    console.log('⏰ 请求超时');
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false,
        error: '请求超时，请稍后重试',
        code: 'TIMEOUT_ERROR'
      });
    }
  });

  try {
    // 使用修复的用户获取
    console.log('🔐 使用getCurrentUser检查认证...');
    const user = await getCurrentUser(req, res);
    
    if (!user) {
      console.log('❌ 认证失败: 无有效用户 - 详细日志:', {
        hasCookies: !!req.headers.cookie,
        cookieLength: req.headers.cookie ? req.headers.cookie.length : 0
      });
      
      return res.status(401).json({ 
        success: false,
        error: '未经授权的访问，请重新登录',
        code: 'UNAUTHORIZED',
        sessionExpired: true
      });
    }

    console.log('✅ 用户认证成功:', { email: user.email, id: user.id });

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false,
        error: '方法不允许',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    const { message, conversationId, mode = 'general', voiceEnabled = false } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '消息内容不能为空',
        code: 'EMPTY_MESSAGE'
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({ 
        success: false,
        error: '消息过长（最大4000字符）',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    if (!AI_MODES[mode]) {
      return res.status(400).json({ 
        success: false,
        error: '无效的AI模式',
        code: 'INVALID_MODE'
      });
    }

    const userId = user.id;

    console.log('🔍 验证用户状态...');
    if (user.status === 'BLOCKED') {
      console.log('❌ 用户账户已被禁用');
      return res.status(403).json({ 
        success: false,
        error: '您的账户已被禁用，请联系管理员',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // 获取 Prisma 客户端
    const prisma = await getPrisma();

    // 构建消息历史
    let messages = [];
    let existingConversation = null;
    
    if (conversationId) {
      console.log('🔍 查找现有对话:', conversationId);
      try {
        existingConversation = await prisma.conversation.findFirst({
          where: { 
            id: conversationId,
            userId: userId
          },
          include: {
            messages: {
              orderBy: {
                createdAt: 'asc'
              },
              take: 20 // 只取最近20条消息
            }
          }
        });
        
        if (!existingConversation) {
          return res.status(404).json({ 
            success: false,
            error: '对话不存在或无权访问',
            code: 'CONVERSATION_NOT_FOUND'
          });
        }
        
        // 转换消息格式
        messages = existingConversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        console.log(`📚 加载了 ${messages.length} 条历史消息`);
      } catch (dbError) {
        console.error('❌ 数据库查询错误:', dbError);
        // 如果数据库查询失败，继续创建新对话
        console.log('⚠️ 数据库查询失败，创建新对话');
        existingConversation = null;
      }
    }

    // 添加当前用户消息
    const userMessage = { role: 'user', content: message.trim() };
    messages.push(userMessage);

    // === 修复：指令识别和处理 ===
    let commandResult = null;
    try {
      // 使用动态导入来避免构建时的问题
      let CommandProcessorClass = CommandProcessor;
      
      // 如果静态导入失败，尝试动态导入
      if (typeof CommandProcessor === 'undefined') {
        console.log('🔄 尝试动态导入 CommandProcessor...');
        const module = await import('../../../lib/command-processor');
        CommandProcessorClass = module.default || module.CommandProcessor;
      }
      
      if (CommandProcessorClass) {
        const commandProcessor = new CommandProcessorClass();
        const commandContext = {
          userId: userId,
          conversationId: conversationId,
          conversationHistory: messages,
          mode: mode,
          voiceEnabled: voiceEnabled
        };

        commandResult = await commandProcessor.processMessage(message, commandContext);
      }
    } catch (commandError) {
      console.log('⚠️ 指令处理器不可用，继续正常对话:', commandError.message);
    }
    
    if (commandResult) {
      console.log('🎯 指令识别成功:', commandResult.command);
      
      // 创建指令响应消息
      const assistantMessage = { 
        role: 'assistant', 
        content: commandResult.message,
        isCommand: true,
        commandData: commandResult
      };

      // 保存到数据库
      let updatedConversation;
      try {
        if (existingConversation) {
          // 保存新消息到数据库
          await prisma.message.create({
            data: {
              conversationId: existingConversation.id,
              role: 'user',
              content: message.trim(),
              userId: userId
            }
          });
          
          await prisma.message.create({
            data: {
              conversationId: existingConversation.id,
              role: 'assistant',
              content: commandResult.message,
              userId: userId,
              metadata: {
                isCommand: true,
                commandData: commandResult
              }
            }
          });

          updatedConversation = await prisma.conversation.update({
            where: { 
              id: conversationId,
              userId: userId
            },
            data: {
              updatedAt: new Date(),
              metadata: {
                ...(existingConversation.metadata || {}),
                lastMode: mode,
                voiceEnabled: voiceEnabled
              }
            }
          });
        } else {
          console.log('💾 创建新对话');
          const title = message.length > 50 
            ? message.substring(0, 47) + '...' 
            : message;

          updatedConversation = await prisma.conversation.create({
            data: {
              userId: userId,
              title: title,
              metadata: {
                initialMode: mode,
                voiceEnabled: voiceEnabled
              },
              messages: {
                create: [
                  {
                    role: 'user',
                    content: message.trim(),
                    userId: userId
                  },
                  {
                    role: 'assistant',
                    content: commandResult.message,
                    userId: userId,
                    metadata: {
                      isCommand: true,
                      commandData: commandResult
                    }
                  }
                ]
              }
            }
          });
        }
      } catch (dbError) {
        console.error('❌ 数据库保存错误（指令）:', dbError);
        // 数据库错误不影响返回指令响应
        console.log('⚠️ 数据库保存失败，但继续返回指令响应');
      }

      console.log('✅ 指令响应成功');
      
      // 返回指令响应
      return res.status(200).json({
        success: true,
        response: commandResult.message,
        reply: commandResult.message,
        conversationId: updatedConversation?.id || conversationId,
        mode: mode,
        modeName: AI_MODES[mode].name,
        timestamp: new Date().toISOString(),
        isCommand: true,
        commandResult: commandResult
      });
    }

    // === 如果没有指令，继续正常AI对话 ===
    console.log('🤖 调用AI服务，消息长度:', message.length, '模式:', mode);
    const aiResponse = await callDeepSeekAI(messages, mode);

    // 保存到数据库
    let updatedConversation;

    try {
      if (existingConversation) {
        console.log('💾 更新现有对话');
        
        // 保存新消息到数据库
        await prisma.message.create({
          data: {
            conversationId: existingConversation.id,
            role: 'user',
            content: message.trim(),
            userId: userId
          }
        });
        
        await prisma.message.create({
          data: {
            conversationId: existingConversation.id,
            role: 'assistant',
            content: aiResponse,
            userId: userId
          }
        });

        updatedConversation = await prisma.conversation.update({
          where: { 
            id: conversationId,
            userId: userId
          },
          data: {
            updatedAt: new Date(),
            metadata: {
              ...(existingConversation.metadata || {}),
              lastMode: mode,
              voiceEnabled: voiceEnabled
            }
          }
        });
      } else {
        console.log('💾 创建新对话');
        const title = message.length > 50 
          ? message.substring(0, 47) + '...' 
          : message;

        updatedConversation = await prisma.conversation.create({
          data: {
            userId: userId,
            title: title,
            metadata: {
              initialMode: mode,
              voiceEnabled: voiceEnabled
            },
            messages: {
              create: [
                {
                  role: 'user',
                  content: message.trim(),
                  userId: userId
                },
                {
                  role: 'assistant',
                  content: aiResponse,
                  userId: userId
                }
              ]
            }
          }
        });
      }
    } catch (dbError) {
      console.error('❌ 数据库保存错误:', dbError);
      // 数据库错误不影响返回AI响应
      console.log('⚠️ 数据库保存失败，但继续返回AI响应');
    }

    console.log('✅ AI响应成功，长度:', aiResponse.length);
    
    // 构建响应数据
    const responseData = {
      success: true,
      response: aiResponse,
      reply: aiResponse, // 兼容性字段
      conversationId: updatedConversation?.id || conversationId,
      mode: mode,
      modeName: AI_MODES[mode].name,
      timestamp: new Date().toISOString()
    };

    // 如果启用了语音，添加语音相关提示
    if (voiceEnabled) {
      responseData.voiceHint = '语音播报已启用';
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ AI聊天API错误:', error);
    
    // 增强错误处理
    const errorResponse = {
      success: false,
      error: '获取AI响应失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    };

    if (error.message?.includes('认证') || error.message?.includes('会话') || error.message?.includes('登录')) {
      errorResponse.error = '认证失败，请重新登录';
      errorResponse.code = 'AUTH_ERROR';
      errorResponse.sessionExpired = true;
      return res.status(401).json(errorResponse);
    }
    
    if (error.message.includes('API密钥') || error.message.includes('API key') || error.message.includes('配置')) {
      errorResponse.error = 'AI服务配置错误，请联系管理员';
      errorResponse.code = 'CONFIG_ERROR';
      return res.status(500).json(errorResponse);
    }
    
    if (error.message.includes('额度') || error.message.includes('quota') || error.message.includes('限额')) {
      errorResponse.error = '服务暂时不可用，请稍后重试';
      errorResponse.code = 'INSUFFICIENT_QUOTA';
      return res.status(429).json(errorResponse);
    }
    
    if (error.message.includes('超时') || error.message.includes('timeout')) {
      errorResponse.error = '请求超时，请稍后重试';
      errorResponse.code = 'TIMEOUT_ERROR';
      return res.status(408).json(errorResponse);
    }
    
    if (error.message.includes('网络') || error.message.includes('network') || error.message.includes('连接')) {
      errorResponse.error = '网络连接失败，请检查网络设置';
      errorResponse.code = 'NETWORK_ERROR';
      return res.status(502).json(errorResponse);
    }
    
    res.status(500).json(errorResponse);
  }
}

async function callDeepSeekAI(messages, mode) {
  try {
    // 动态导入OpenAI，避免服务端问题
    const { OpenAI } = await import('openai');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API密钥未配置');
    }

    console.log('🔑 配置OpenAI客户端');
    
    // 每次创建新的客户端实例，避免连接池问题
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
      timeout: 60000, // 60秒超时
      maxRetries: 2
    });

    const modeConfig = AI_MODES[mode];

    // 构建系统提示词
    const systemMessage = {
      role: 'system',
      content: modeConfig.prompt
    };

    // 将系统消息插入到对话开始
    const conversationWithSystem = [systemMessage, ...messages];

    console.log('🚀 发送AI请求', {
      消息数量: conversationWithSystem.length,
      模型: process.env.OPENAI_MODEL || 'deepseek-chat',
      最大token数: modeConfig.maxTokens,
      温度: modeConfig.temperature
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      messages: conversationWithSystem,
      max_tokens: modeConfig.maxTokens,
      temperature: modeConfig.temperature,
      stream: false
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('AI返回了空响应');
    }

    console.log('✅ AI响应接收成功，token使用情况:', {
      输入token: completion.usage?.prompt_tokens,
      输出token: completion.usage?.completion_tokens,
      总token: completion.usage?.total_tokens
    });

    return response;

  } catch (error) {
    console.error('❌ DeepSeek API调用错误:', {
      错误信息: error.message,
      状态码: error.status,
      错误代码: error.code,
      错误类型: error.type
    });
    
    // 详细的错误处理
    if (error.status === 401) {
      throw new Error('API密钥无效或已过期');
    } else if (error.status === 429) {
      throw new Error('API调用频率超限，请稍后重试');
    } else if (error.status === 408 || error.code === 'ETIMEDOUT') {
      throw new Error('AI服务响应超时');
    } else if (error.message.includes('model_not_found')) {
      throw new Error('AI模型不可用，请检查配置');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('无法连接到AI服务，网络错误');
    } else if (error.status >= 500) {
      throw new Error('AI服务内部错误，请稍后重试');
    } else {
      throw new Error(`AI服务错误: ${error.message}`);
    }
  }
}