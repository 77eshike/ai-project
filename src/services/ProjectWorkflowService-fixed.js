const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProjectWorkflowService {
  static async formatProjectWithAI(projectId, template = 'STANDARD') {
    console.log(`🔄 开始AI格式化项目: ${projectId}, 模板: ${template}`);
    
    try {
      // 1. 验证项目存在
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        throw new Error('项目不存在');
      }
      
      // 2. 验证项目内容
      if (!project.content || project.content.trim().length < 10) {
        throw new Error('项目内容过短，请提供至少10个字符的详细描述');
      }
      
      console.log(`📝 项目内容: ${project.content.substring(0, 100)}...`);
      
      // 3. 更新状态为处理中
      await prisma.project.update({
        where: { id: projectId },
        data: {
          formattingStatus: 'PROCESSING',
          formattingTemplate: template
        }
      });
      
      // 4. 调用AI服务
      const formattedContent = await this.callAIService(project.content, template);
      
      if (!formattedContent) {
        throw new Error('AI服务返回空内容');
      }
      
      // 5. 更新项目数据
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          aiFormattedContent: formattedContent,
          formattingStatus: 'COMPLETED',
          formattingTemplate: template,
          currentReviewRound: {
            increment: 1
          },
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ AI格式化成功: 项目 ${projectId}`);
      console.log(`📊 生成内容长度: ${formattedContent.length} 字符`);
      
      return {
        success: true,
        project: updatedProject
      };
      
    } catch (error) {
      console.error(`❌ AI格式化失败: ${projectId}`, error);
      
      // 更新状态为失败
      await prisma.project.update({
        where: { id: projectId },
        data: {
          formattingStatus: 'FAILED',
          formattingHistory: {
            push: {
              timestamp: new Date(),
              template: template,
              error: error.message
            }
          }
        }
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  static async callAIService(content, template) {
    // 检查AI服务配置
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
      throw new Error('AI服务配置不完整');
    }
    
    const prompt = this.buildFormattingPrompt(content, template);
    
    console.log(`🤖 调用AI服务: ${process.env.OPENAI_BASE_URL}`);
    console.log(`📨 请求内容长度: ${prompt.length} 字符`);
    
    try {
      const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一个专业的项目文档格式化助手。请将用户提供的项目描述整理成结构清晰、专业的项目文档格式。直接返回格式化后的内容，不要添加额外的说明。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });
      
      console.log(`📨 AI服务响应状态: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ AI服务调用失败: ${response.status}`, errorText);
        throw new Error(`AI服务调用失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📊 AI服务响应数据:`, {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        hasMessage: !!data.choices?.[0]?.message,
        hasContent: !!data.choices?.[0]?.message?.content
      });
      
      // 修复：使用更安全的属性访问
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('AI服务返回数据格式异常：缺少choices数组');
      }
      
      const firstChoice = data.choices[0];
      if (!firstChoice.message) {
        throw new Error('AI服务返回数据格式异常：缺少message对象');
      }
      
      const content = firstChoice.message.content;
      if (!content) {
        throw new Error('AI服务返回数据格式异常：缺少content内容');
      }
      
      return content;
      
    } catch (error) {
      console.error('❌ AI服务调用异常:', error);
      throw new Error(`AI服务调用异常: ${error.message}`);
    }
  }
  
  static buildFormattingPrompt(content, template) {
    const templatePrompts = {
      'STANDARD': `请将以下项目内容格式化为结构完整的项目文档：

项目原始内容：
"""
${content}
"""

请按照以下结构进行格式化：
# 项目概述
[在此处提供项目概述]

## 项目目标
- [目标1]
- [目标2]

## 主要功能
- [功能1]
- [功能2]

## 技术架构
- [技术组件1]
- [技术组件2]

## 实施计划
- [阶段1]
- [阶段2]

## 预期成果
- [成果1]
- [成果2]

请使用专业的商业文档语言，保持内容准确性和完整性。直接返回格式化后的文档内容。`,
      
      'DETAILED': `请将以下项目内容格式化为详细的项目方案文档：

项目原始内容：
"""
${content}
"""

请创建包含以下部分的详细项目文档：
# 执行摘要
[项目简要概述]

## 项目背景
[项目背景和需求]

## 目标与范围
- [具体目标1]
- [具体目标2]

## 功能需求
- [功能需求1]
- [功能需求2]

## 技术方案
- [技术选型]
- [架构设计]

## 实施路线图
- [里程碑1]
- [里程碑2]

## 风险评估
- [风险1及应对措施]
- [风险2及应对措施]

## 成功指标
- [指标1]
- [指标2]

请确保文档专业、详细且可执行。直接返回格式化后的文档内容。`
    };
    
    return templatePrompts[template] || templatePrompts['STANDARD'];
  }
  
  static async retryFailedFormatting(projectId) {
    console.log(`🔄 重试失败的格式化: ${projectId}`);
    
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        throw new Error('项目不存在');
      }
      
      // 如果内容仍然过短，提供建议
      if (!project.content || project.content.trim().length < 10) {
        return {
          success: false,
          error: '项目内容过短，无法进行AI格式化。请先编辑项目添加更多详细信息。',
          needsContent: true
        };
      }
      
      return await this.formatProjectWithAI(
        projectId, 
        project.formattingTemplate || 'STANDARD'
      );
      
    } catch (error) {
      console.error(`❌ 重试格式化失败: ${projectId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async publishToFormalProject(projectId, targetType = 'STANDARD_PROJECT') {
    console.log(`🚀 发布项目为正式项目: ${projectId}, 目标类型: ${targetType}`);
    
    try {
      // 验证项目存在
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        throw new Error('项目不存在');
      }
      
      // 验证项目状态
      if (project.projectType !== 'DRAFT_PROJECT') {
        throw new Error('只能发布待定项目');
      }
      
      if (project.formattingStatus !== 'COMPLETED') {
        throw new Error('项目必须先完成AI格式化才能发布');
      }
      
      // 更新项目类型和状态
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          projectType: targetType,
          status: 'RECRUITING', // 发布后进入招募状态
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ 项目发布成功: ${projectId} -> ${targetType}`);
      return {
        success: true,
        project: updatedProject
      };
      
    } catch (error) {
      console.error(`❌ 项目发布失败: ${projectId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { ProjectWorkflowService };
