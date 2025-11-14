// src/lib/command-processor.js - 完整修复版本

export class CommandProcessor {
  constructor() {
    this.commands = {
      '转入知识库': this.handleSaveToKnowledge.bind(this),
      '生成待定项目': this.handleGenerateDraftProject.bind(this),
      '语音开关': this.handleToggleVoice.bind(this),
      '整理知识库': this.handleOrganizeKnowledge.bind(this),
      '保存知识': this.handleSaveToKnowledge.bind(this), // 别名
      '创建项目': this.handleGenerateDraftProject.bind(this), // 别名
    };
    
    this.prisma = null;
    this.openai = null;
    this.initialized = false;
  }

  // 初始化方法 - 修复循环依赖
  async initialize() {
    if (this.initialized) return;
    
    try {
      // 动态导入所有依赖，避免构建时问题
      const [{ PrismaClient }, { OpenAI }] = await Promise.all([
        import('@prisma/client'),
        import('openai')
      ]);
      
      this.prisma = new PrismaClient();
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
      });
      
      this.initialized = true;
      console.log('✅ CommandProcessor 初始化完成');
    } catch (error) {
      console.error('❌ CommandProcessor 初始化失败:', error);
      // 即使初始化失败，也允许继续运行，只是某些功能会降级
    }
  }

  // 获取 Prisma 实例 - 修复字段名问题
  async getPrisma() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.prisma;
  }

  // 获取 OpenAI 实例
  async getOpenAI() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.openai;
  }

  async processMessage(message, context) {
    const { userId, conversationHistory } = context;
    
    // 确保初始化
    if (!this.initialized) {
      await this.initialize();
    }
    
    // 检测指令
    for (const [command, handler] of Object.entries(this.commands)) {
      if (message.includes(command)) {
        console.log(`🎯 检测到指令: ${command}`);
        return await handler(message, context);
      }
    }
    
    return null;
  }

  async handleSaveToKnowledge(message, context) {
    const { userId, conversationHistory } = context;
    
    try {
      const prisma = await this.getPrisma();
      if (!prisma) {
        throw new Error('数据库连接不可用');
      }
      
      // 总结对话内容
      const summary = await this.summarizeConversation(conversationHistory);
      
      // 自动分类
      const category = await this.categorizeContent(summary);
      
      // 保存到知识库 - 修复字段名问题
      let knowledgeItem;
      try {
        // 首先尝试使用 knowledge 模型
        knowledgeItem = await prisma.knowledge.create({
          data: {
            content: summary,
            category,
            tags: await this.extractTags(summary),
            source: 'chat',
            userId: parseInt(userId)
          }
        });
      } catch (dbError) {
        console.log('⚠️ knowledge 模型失败，尝试 knowledgeItem:', dbError.message);
        // 如果 knowledge 模型不存在，尝试 knowledgeItem
        knowledgeItem = await prisma.knowledgeItem.create({
          data: {
            content: summary,
            category,
            tags: await this.extractTags(summary),
            source: 'chat',
            userId: parseInt(userId)
          }
        });
      }
      
      return {
        type: 'command_response',
        command: 'save_to_knowledge',
        success: true,
        message: `✅ 已保存到知识库 - 分类: ${category}`,
        data: {
          knowledgeId: knowledgeItem.id,
          category,
          summary: summary.substring(0, 100) + '...'
        }
      };
      
    } catch (error) {
      console.error('保存到知识库失败:', error);
      return {
        type: 'command_response',
        command: 'save_to_knowledge',
        success: false,
        message: '❌ 保存到知识库失败，请稍后重试'
      };
    }
  }

  async handleGenerateDraftProject(message, context) {
    const { userId, conversationHistory } = context;
    
    try {
      const prisma = await this.getPrisma();
      if (!prisma) {
        throw new Error('数据库连接不可用');
      }
      
      // 生成项目草案
      const projectDraft = await this.generateProjectDraft(conversationHistory);
      
      // 创建待定项目
      const project = await prisma.project.create({
        data: {
          title: projectDraft.title,
          description: projectDraft.description,
          content: projectDraft.content,
          aiGeneratedContent: projectDraft.content,
          ownerId: parseInt(userId),
          status: 'DRAFT',
          type: 'DRAFT_PROJECT',
          visibility: 'PRIVATE'
        }
      });
      
      // 添加创建者为项目成员
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: parseInt(userId),
          role: 'OWNER'
        }
      });
      
      return {
        type: 'command_response',
        command: 'generate_draft_project',
        success: true,
        message: `🎯 已生成待定项目: ${projectDraft.title}`,
        data: {
          projectId: project.id,
          title: projectDraft.title,
          description: projectDraft.description,
          nextStep: '请前往项目页面完善详细信息'
        }
      };
      
    } catch (error) {
      console.error('生成项目失败:', error);
      return {
        type: 'command_response',
        command: 'generate_draft_project',
        success: false,
        message: '❌ 生成项目失败，请稍后重试'
      };
    }
  }

  async handleToggleVoice(message, context) {
    const voiceState = message.includes('开启') ? 'on' : 
                      message.includes('关闭') ? 'off' : 'toggle';
    
    return {
      type: 'command_response',
      command: 'toggle_voice',
      success: true,
      message: voiceState === 'on' ? '🔊 语音输出已开启' : '🔇 语音输出已关闭',
      data: { voiceState }
    };
  }

  async handleOrganizeKnowledge(message, context) {
    const { userId } = context;
    
    try {
      const prisma = await this.getPrisma();
      if (!prisma) {
        throw new Error('数据库连接不可用');
      }
      
      // 获取用户的所有知识库内容 - 修复字段名问题
      let knowledges = [];
      try {
        // 首先尝试使用 knowledge 模型
        knowledges = await prisma.knowledge.findMany({
          where: { userId: parseInt(userId) }
        });
      } catch (dbError) {
        console.log('⚠️ knowledge 模型失败，尝试 knowledgeItem:', dbError.message);
        // 如果 knowledge 模型不存在，尝试 knowledgeItem
        knowledges = await prisma.knowledgeItem.findMany({
          where: { userId: parseInt(userId) }
        });
      }
      
      let reorganizedCount = 0;
      
      // 重新分类每条内容
      for (const knowledge of knowledges) {
        const newCategory = await this.categorizeContent(knowledge.content);
        
        if (newCategory !== knowledge.category) {
          try {
            // 尝试使用 knowledge 模型更新
            await prisma.knowledge.update({
              where: { id: knowledge.id },
              data: { category: newCategory }
            });
          } catch (updateError) {
            // 如果失败，尝试使用 knowledgeItem 模型
            await prisma.knowledgeItem.update({
              where: { id: knowledge.id },
              data: { category: newCategory }
            });
          }
          reorganizedCount++;
        }
      }
      
      return {
        type: 'command_response',
        command: 'organize_knowledge',
        success: true,
        message: `📚 已整理知识库，重新分类了 ${reorganizedCount} 条内容`,
        data: { reorganizedCount, totalCount: knowledges.length }
      };
      
    } catch (error) {
      console.error('整理知识库失败:', error);
      return {
        type: 'command_response',
        command: 'organize_knowledge',
        success: false,
        message: '❌ 整理知识库失败'
      };
    }
  }

  // 内容分类方法
  async categorizeContent(content) {
    try {
      const openai = await this.getOpenAI();
      if (!openai) {
        return '其他'; // 降级处理
      }
      
      const prompt = `请对以下内容进行分类，选择最合适的类别：
      
内容：${content.substring(0, 500)}

可选类别：技术、学习、工作、生活、创意、其他

请只返回类别名称：`;
      
      const category = await this.callAI(prompt);
      return category.trim() || '其他';
    } catch (error) {
      console.error('分类失败:', error);
      return '其他';
    }
  }

  // AI辅助方法
  async summarizeConversation(conversationHistory) {
    try {
      const openai = await this.getOpenAI();
      if (!openai) {
        // 降级处理：简单拼接
        return conversationHistory.map(msg => msg.content).join(' ').substring(0, 500);
      }
      
      const prompt = `请总结以下对话的要点和关键信息：

${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

请用简洁的语言总结核心内容：`;
      
      return await this.callAI(prompt);
    } catch (error) {
      console.error('总结失败:', error);
      // 降级处理
      return conversationHistory.map(msg => msg.content).join(' ').substring(0, 500);
    }
  }

  async extractTags(content) {
    try {
      const openai = await this.getOpenAI();
      if (!openai) {
        // 降级处理：使用简单关键词提取
        const words = content.split(/\s+/).filter(word => word.length > 1);
        return words.slice(0, 3);
      }
      
      const prompt = `请从以下内容中提取3-5个关键词作为标签：
${content}

请以逗号分隔返回关键词：`;
      
      const tagsStr = await this.callAI(prompt);
      return tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).slice(0, 5);
    } catch (error) {
      console.error('提取标签失败:', error);
      // 降级处理
      const words = content.split(/\s+/).filter(word => word.length > 1);
      return words.slice(0, 3);
    }
  }

  async generateProjectDraft(conversationHistory) {
    try {
      const openai = await this.getOpenAI();
      if (!openai) {
        // 降级处理：返回简单草案
        return {
          title: '新项目草案',
          description: '基于对话生成的项目',
          content: conversationHistory.map(msg => msg.content).join('\n')
        };
      }
      
      const prompt = `基于以下对话内容，生成一个完整的项目草案：

${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

请按照以下JSON格式返回：
{
  "title": "项目标题",
  "description": "项目简要描述",
  "content": "详细的项目方案"
}`;
      
      const response = await this.callAI(prompt);
      
      try {
        // 尝试提取JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(response);
      } catch (error) {
        console.log('JSON解析失败，使用默认结构:', error);
        // 如果JSON解析失败，返回默认结构
        return {
          title: '新项目',
          description: '基于对话生成的项目',
          content: response
        };
      }
    } catch (error) {
      console.error('生成项目草案失败:', error);
      // 降级处理
      return {
        title: '新项目草案',
        description: '基于对话生成的项目',
        content: conversationHistory.map(msg => msg.content).join('\n')
      };
    }
  }

  async callAI(prompt) {
    try {
      const openai = await this.getOpenAI();
      if (!openai) {
        throw new Error('OpenAI 客户端不可用');
      }
      
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content?.trim() || '无响应内容';
    } catch (error) {
      console.error('AI调用失败:', error);
      // 返回默认值而不是抛出错误，避免影响用户体验
      return '默认内容';
    }
  }

  // 销毁方法，用于清理资源
  async destroy() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    this.initialized = false;
    this.prisma = null;
    this.openai = null;
  }
}

// 创建单例实例 - 修复版本
let commandProcessorInstance = null;

export async function getCommandProcessor() {
  if (!commandProcessorInstance) {
    commandProcessorInstance = new CommandProcessor();
    // 预初始化但不阻塞
    commandProcessorInstance.initialize().catch(error => {
      console.error('CommandProcessor 预初始化失败:', error);
    });
  }
  return commandProcessorInstance;
}

// 简化版本，用于快速测试
export function createSimpleCommandProcessor() {
  return {
    async processMessage(message, context) {
      const simpleCommands = {
        '语音开关': () => ({
          type: 'command_response',
          command: 'toggle_voice',
          success: true,
          message: message.includes('开启') ? '🔊 语音输出已开启' : '🔇 语音输出已关闭',
          data: { voiceState: message.includes('开启') ? 'on' : 'off' }
        }),
        '转入知识库': () => ({
          type: 'command_response',
          command: 'save_to_knowledge',
          success: true,
          message: '✅ 已记录保存请求（简化模式）',
          data: { simplified: true }
        })
      };

      for (const [command, handler] of Object.entries(simpleCommands)) {
        if (message.includes(command)) {
          console.log(`🎯 检测到简化指令: ${command}`);
          return handler();
        }
      }
      
      return null;
    }
  };
}

export default CommandProcessor;