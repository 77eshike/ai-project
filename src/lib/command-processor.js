// src/lib/command-processor.js - 修复版本

// 移除顶部的直接导入，改为在方法内部动态导入
// import { PrismaClient } from '@prisma/client';
// import { OpenAI } from 'openai';

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
  }

  // 获取 Prisma 实例
  async getPrisma() {
    if (!this.prisma) {
      const { PrismaClient } = await import('@prisma/client');
      this.prisma = new PrismaClient();
    }
    return this.prisma;
  }

  // 获取 OpenAI 实例
  async getOpenAI() {
    if (!this.openai) {
      const { OpenAI } = await import('openai');
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
      });
    }
    return this.openai;
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
      const prisma = await this.getPrisma();
      
      // 总结对话内容
      const summary = await this.summarizeConversation(conversationHistory);
      
      // 自动分类
      const category = await this.categorizeContent(summary);
      
      // 保存到知识库
      const knowledgeItem = await prisma.knowledge.create({
        data: {
          content: summary,
          category,
          tags: await this.extractTags(summary),
          source: 'chat',
          userId: parseInt(userId)
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
      const prisma = await this.getPrisma();
      
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
      
      // 获取用户的所有知识库内容
      const knowledges = await prisma.knowledge.findMany({
        where: { userId: parseInt(userId) }
      });
      
      let reorganizedCount = 0;
      
      // 重新分类每条内容
      for (const knowledge of knowledges) {
        const newCategory = await this.categorizeContent(knowledge.content);
        
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

  // 内容分类方法
  async categorizeContent(content) {
    const prompt = `请对以下内容进行分类，选择最合适的类别：
    
内容：${content.substring(0, 500)}

可选类别：技术、学习、工作、生活、创意、其他

请只返回类别名称：`;
    
    const category = await this.callAI(prompt);
    return category.trim() || '其他';
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
    return tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).slice(0, 5);
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
  }

  async callAI(prompt) {
    try {
      const openai = await this.getOpenAI();
      
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
  }
}

// 创建单例实例
let commandProcessorInstance = null;

export function getCommandProcessor() {
  if (!commandProcessorInstance) {
    commandProcessorInstance = new CommandProcessor();
  }
  return commandProcessorInstance;
}

export default CommandProcessor;