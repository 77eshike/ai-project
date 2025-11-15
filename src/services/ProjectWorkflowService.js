// src/services/ProjectWorkflowService.js
import { prisma } from '../lib/prisma';

export class ProjectWorkflowService {
  
  /**
   * 一键AI格式化项目内容
   */
  static async formatProjectWithAI(projectId, template = 'STANDARD') {
    try {
      console.log(`🚀 开始AI格式化项目: ${projectId}, 模板: ${template}`);

      // 1. 更新状态为处理中
      await prisma.project.update({
        where: { id: projectId },
        data: { 
          formattingStatus: 'PROCESSING',
          status: 'FINALIZING'
        }
      });

      // 2. 获取项目数据
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          projectComments: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { name: true } } }
          },
          owner: { select: { id: true, name: true, email: true } }
        }
      });

      if (!project) {
        throw new Error('项目不存在');
      }

      console.log(`📋 获取项目数据: ${project.title}`);

      // 3. 构建AI提示词
      const prompt = this.buildFormattingPrompt(project, template);
      
      // 4. 模拟AI格式化（暂时使用模拟数据，后续集成真实AI）
      const formattedContent = await this.mockAIFormatting(project.content, prompt, template);

      console.log(`✅ AI格式化完成，内容长度: ${formattedContent.length}`);

      // 5. 保存结果
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          aiFormattedContent: formattedContent,
          formattingStatus: 'COMPLETED',
          formattingTemplate: template,
          formattingHistory: this.createFormattingHistory(project.content, formattedContent, template)
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: { projectComments: true }
          }
        }
      });

      return {
        success: true,
        project: updatedProject,
        message: 'AI格式化完成',
        changes: this.calculateChanges(project.content, formattedContent)
      };

    } catch (error) {
      console.error('❌ AI格式化失败:', error);
      
      // 更新状态为失败
      await prisma.project.update({
        where: { id: projectId },
        data: { 
          formattingStatus: 'FAILED'
        }
      });

      throw new Error(`AI格式化失败: ${error.message}`);
    }
  }

  /**
   * 模拟AI格式化（临时方案）
   */
  static async mockAIFormatting(originalContent, prompt, template) {
    // 模拟AI处理延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 简单的格式化逻辑
    const formattingRules = {
      STANDARD: this.applyStandardFormatting,
      TECHNICAL: this.applyTechnicalFormatting,
      ACADEMIC: this.applyAcademicFormatting
    };

    const formatter = formattingRules[template] || formattingRules.STANDARD;
    return formatter(originalContent);
  }

  /**
   * 标准商业文档格式化
   */
  static applyStandardFormatting(content) {
    const sections = [
      '# 项目概述',
      '## 项目背景',
      '## 项目目标', 
      '## 实施计划',
      '## 预期成果',
      '## 资源需求'
    ];

    return this.structureContent(content, sections);
  }

  /**
   * 技术文档格式化
   */
  static applyTechnicalFormatting(content) {
    const sections = [
      '# 技术方案',
      '## 系统架构',
      '## 技术栈',
      '## 开发计划',
      '## 测试策略',
      '## 部署方案'
    ];

    return this.structureContent(content, sections);
  }

  /**
   * 学术论文格式化
   */
  static applyAcademicFormatting(content) {
    const sections = [
      '# 研究题目',
      '## 摘要',
      '## 研究背景',
      '## 研究方法',
      '## 研究结果',
      '## 讨论与分析',
      '## 参考文献'
    ];

    return this.structureContent(content, sections);
  }

  /**
   * 通用内容结构化
   */
  static structureContent(content, sections) {
    let formatted = '';
    
    sections.forEach((section, index) => {
      formatted += `${section}\n\n`;
      
      // 为每个章节添加一些示例内容
      if (content && content.length > 0) {
        const contentParts = this.splitContentByLength(content, sections.length);
        formatted += `${contentParts[index] || '此处填写具体内容...'}\n\n`;
      } else {
        formatted += '此处填写具体内容...\n\n';
      }
    });

    return formatted;
  }

  /**
   * 构建格式化提示词
   */
  static buildFormattingPrompt(project, template) {
    const basePrompt = `请将以下项目内容进行专业格式排版，要求：
1. 保持原意不变，只进行格式优化
2. 添加清晰的章节结构
3. 统一字体、间距和段落格式
4. 优化可读性
5. 根据项目类型应用合适的文档标准

项目标题: ${project.title}
项目描述: ${project.description}
原始内容: ${project.content}

`;

    const templatePrompts = {
      STANDARD: `${basePrompt}请按照标准商业文档格式排版。`,
      TECHNICAL: `${basePrompt}请按照技术文档标准格式排版，注意代码块和技术术语的格式。`,
      ACADEMIC: `${basePrompt}请按照学术论文格式排版，注意参考文献和章节编号。`
    };

    return templatePrompts[template] || templatePrompts.STANDARD;
  }

  /**
   * 创建格式化历史记录
   */
  static createFormattingHistory(originalContent, formattedContent, template) {
    return {
      timestamp: new Date().toISOString(),
      template: template,
      originalLength: originalContent?.length || 0,
      formattedLength: formattedContent.length,
      changes: this.calculateChanges(originalContent, formattedContent)
    };
  }

  /**
   * 计算内容变化
   */
  static calculateChanges(original, formatted) {
    const originalLines = original?.split('\n').length || 0;
    const formattedLines = formatted.split('\n').length;
    const originalWords = original?.split(/\s+/).length || 0;
    const formattedWords = formatted.split(/\s+/).length;

    return {
      linesAdded: Math.max(0, formattedLines - originalLines),
      wordsAdded: Math.max(0, formattedWords - originalWords),
      structureImproved: formattedLines > originalLines,
      readabilityScore: this.calculateReadabilityScore(formatted)
    };
  }

  /**
   * 计算可读性评分
   */
  static calculateReadabilityScore(content) {
    // 简单的可读性评分逻辑
    const lines = content.split('\n');
    const avgLineLength = content.length / Math.max(lines.length, 1);
    const sectionCount = (content.match(/#+/g) || []).length;
    
    let score = 50; // 基础分
    
    // 章节结构加分
    if (sectionCount >= 3) score += 20;
    if (sectionCount >= 5) score += 10;
    
    // 行长度优化
    if (avgLineLength > 50 && avgLineLength < 120) score += 20;
    
    return Math.min(100, score);
  }

  /**
   * 分割内容
   */
  static splitContentByLength(content, parts) {
    const partLength = Math.ceil(content.length / parts);
    const result = [];
    
    for (let i = 0; i < parts; i++) {
      const start = i * partLength;
      const end = start + partLength;
      result.push(content.substring(start, end));
    }
    
    return result;
  }

  /**
   * 将待定项目转为正式项目
   */
  static async publishToFormalProject(projectId, targetType = 'STANDARD_PROJECT') {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          owner: { select: { id: true, name: true, email: true } }
        }
      });

      if (!project) {
        throw new Error('项目不存在');
      }

      if (project.projectType !== 'DRAFT_PROJECT') {
        throw new Error('只能将待定项目转为正式项目');
      }

      if (project.formattingStatus !== 'COMPLETED') {
        throw new Error('请先完成AI格式化');
      }

      console.log(`🚀 发布项目为正式项目: ${project.title} -> ${targetType}`);

      // 更新项目类型和状态
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          projectType: targetType,
          status: 'RECRUITING', // 转为招募状态
          content: project.aiFormattedContent || project.content, // 使用格式化后的内容
          visibility: 'PUBLIC' // 正式项目默认公开
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: { projectMembers: true, projectComments: true }
          }
        }
      });

      return {
        success: true,
        project: updatedProject,
        message: '项目已成功发布为正式项目'
      };

    } catch (error) {
      console.error('❌ 发布项目失败:', error);
      throw new Error(`发布项目失败: ${error.message}`);
    }
  }

  /**
   * 获取公共看板项目
   */
  static async getPublicBoardProjects() {
    try {
      const [draftProjects, recruitingProjects, ongoingProjects] = await Promise.all([
        // 待定项目区：所有公开的待定项目
        prisma.project.findMany({
          where: {
            projectType: 'DRAFT_PROJECT',
            visibility: 'PUBLIC',
            status: { in: ['DRAFT', 'IN_REVIEW', 'FINALIZING'] }
          },
          include: {
            owner: { select: { id: true, name: true, image: true } },
            _count: {
              select: { projectComments: { where: { status: 'ACTIVE' } } }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 20
        }),

        // 招募中项目区
        prisma.project.findMany({
          where: {
            projectType: { not: 'DRAFT_PROJECT' },
            status: 'RECRUITING',
            visibility: 'PUBLIC'
          },
          include: {
            owner: { select: { id: true, name: true, image: true } },
            _count: {
              select: { projectMembers: true }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 20
        }),

        // 进行中项目区
        prisma.project.findMany({
          where: {
            projectType: { not: 'DRAFT_PROJECT' },
            status: 'IN_PROGRESS',
            visibility: 'PUBLIC'
          },
          include: {
            owner: { select: { id: true, name: true, image: true } },
            _count: {
              select: { projectMembers: true }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 20
        })
      ]);

      return {
        draftProjects,
        recruitingProjects, 
        ongoingProjects
      };

    } catch (error) {
      console.error('❌ 获取公共看板项目失败:', error);
      throw new Error(`获取公共看板项目失败: ${error.message}`);
    }
  }
}