import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();

// 初始化OpenAI - 使用与现有聊天相同的配置
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
});

export class CommandProcessor {
  constructor() {
    this.commands = {
      '转入知识库': this.handleSaveToKnowledge.bind(this),
      '生成待定项目': this.handleGenerateDraftProject.bind(this),
      '语音开关': this.handleToggleVoice.bind(this),
      '整理知识库': this.handleOrganizeKnowledge.bind(this)
    };
  }

  async processMessage(message, context) {
    const { userId, conversationHistory } = context;
    
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
      // 使用现有AI服务分类内容
      const { categorizeContent } = await import('@/lib/ai-service');
      
      // 总结对话内容
      const summary = await this.summarizeConversation(conversationHistory);
      
      // 自动分类
      const category = await categorizeContent(summary);
      
      // 保存到知识库
      const knowledgeItem = await prisma.knowledge.create({
        data: {
          content: summary,
          category,
          tags: await this.extractTags(summary),
          source: 'chat',
          userId
        }
      });
      
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
      // 生成项目草案
      const projectDraft = await this.generateProjectDraft(conversationHistory);
      
      // 创建待定项目
      const project = await prisma.project.create({
        data: {
          title: projectDraft.title,
          description: projectDraft.description,
          content: projectDraft.content,
          aiGeneratedContent: projectDraft.content,
          ownerId: userId,
          status: 'DRAFT',
          type: 'DRAFT_PROJECT',
          visibility: 'PRIVATE'
        }
      });
      
      // 添加创建者为项目成员
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: userId,
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
      const { categorizeContent } = await import('@/lib/ai-service');
      
      // 获取用户的所有知识库内容
      const knowledges = await prisma.knowledge.findMany({
        where: { userId }
      });
      
      let reorganizedCount = 0;
      
      // 重新分类每条内容
      for (const knowledge of knowledges) {
        const newCategory = await categorizeContent(knowledge.content);
        
        if (newCategory !== knowledge.category) {
          await prisma.knowledge.update({
            where: { id: knowledge.id },
            data: { category: newCategory }
          });
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

  // AI辅助方法
  async summarizeConversation(conversationHistory) {
    const prompt = `请总结以下对话的要点和关键信息：

${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

请用简洁的语言总结核心内容：`;
    
    return await this.callAI(prompt);
  }

  async extractTags(content) {
    const prompt = `请从以下内容中提取3-5个关键词作为标签：
${content}

请以逗号分隔返回关键词：`;
    
    const tagsStr = await this.callAI(prompt);
    return tagsStr.split(',').map(tag => tag.trim()).slice(0, 5);
  }

  async generateProjectDraft(conversationHistory) {
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
      return JSON.parse(response);
    } catch (error) {
      // 如果JSON解析失败，返回默认结构
      return {
        title: '新项目',
        description: '基于对话生成的项目',
        content: response
      };
    }
  }

  async callAI(prompt) {
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || '无响应内容';
    } catch (error) {
      console.error('AI调用失败:', error);
      throw new Error('AI服务暂时不可用');
    }
  }
}

export default CommandProcessor;