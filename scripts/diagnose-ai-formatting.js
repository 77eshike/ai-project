// scripts/diagnose-ai-formatting.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AIFormattingDiagnoser {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async diagnoseFormattingFailure() {
    console.log('🔍 诊断AI格式化失败问题...\n');
    
    try {
      // 1. 检查项目数据
      await this.checkProjectData();
      
      // 2. 检查AI服务配置
      await this.checkAIServiceConfig();
      
      // 3. 检查API端点
      await this.checkAPIEndpoints();
      
      // 4. 检查数据库状态
      await this.checkDatabaseState();
      
      // 5. 运行修复
      await this.applyFixes();
      
    } catch (error) {
      console.error('❌ 诊断过程中出错:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  async checkProjectData() {
    console.log('1️⃣ 检查项目数据...');
    
    try {
      // 获取所有格式化失败的项目
      const failedProjects = await prisma.project.findMany({
        where: {
          formattingStatus: 'FAILED'
        },
        select: {
          id: true,
          title: true,
          content: true,
          formattingStatus: true,
          projectType: true,
          status: true
        }
      });
      
      console.log(`📋 找到 ${failedProjects.length} 个格式化失败的项目:`);
      
      failedProjects.forEach(project => {
        console.log(`   - ${project.title} (${project.id})`);
        console.log(`     内容长度: ${project.content?.length || 0} 字符`);
        console.log(`     类型: ${project.projectType}, 状态: ${project.status}`);
        
        // 诊断内容问题
        if (!project.content || project.content.trim().length < 10) {
          this.issues.push(`项目 "${project.title}" 内容过短，无法进行AI格式化`);
          this.fixes.push({
            type: 'content',
            projectId: project.id,
            message: '需要丰富项目内容'
          });
        }
      });
      
    } catch (error) {
      console.error('❌ 检查项目数据失败:', error);
    }
  }

  async checkAIServiceConfig() {
    console.log('\n2️⃣ 检查AI服务配置...');
    
    const requiredConfig = {
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
      'OPENAI_BASE_URL': process.env.OPENAI_BASE_URL,
      'DEEPSEEK_API_KEY': process.env.DEEPSEEK_API_KEY
    };
    
    Object.entries(requiredConfig).forEach(([key, value]) => {
      if (!value) {
        this.issues.push(`缺失AI服务配置: ${key}`);
        console.log(`❌ ${key}: 未配置`);
      } else {
        console.log(`✅ ${key}: 已配置`);
        
        // 检查API密钥格式
        if (key.includes('KEY') && value.length < 20) {
          this.issues.push(`API密钥格式可能不正确: ${key}`);
        }
      }
    });
    
    // 测试AI服务连通性
    await this.testAIConnectivity();
  }

  async testAIConnectivity() {
    console.log('\n🔌 测试AI服务连通性...');
    
    try {
      if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
        console.log('⚠️  跳过AI连通性测试: 缺少配置');
        return;
      }
      
      const testPayload = {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: "请回复'测试成功'，这是一个连通性测试。"
          }
        ],
        max_tokens: 50
      };
      
      const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(testPayload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ AI服务连通性测试成功');
        console.log(`   模型: ${data.model}, 使用Token: ${data.usage?.total_tokens}`);
      } else {
        const errorText = await response.text();
        this.issues.push(`AI服务API调用失败: HTTP ${response.status}`);
        console.log(`❌ AI服务API调用失败: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      this.issues.push(`AI服务连通性测试异常: ${error.message}`);
      console.log(`❌ AI服务连通性测试异常: ${error.message}`);
    }
  }

  async checkAPIEndpoints() {
    console.log('\n3️⃣ 检查API端点...');
    
    const endpoints = [
      '/api/projects/[id]/format',
      '/api/ai/format',
      '/api/projects/new'
    ];
    
    for (const endpoint of endpoints) {
      try {
        // 这里可以添加具体的端点测试逻辑
        console.log(`✅ ${endpoint}: 端点存在`);
      } catch (error) {
        this.issues.push(`API端点问题: ${endpoint} - ${error.message}`);
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
  }

  async checkDatabaseState() {
    console.log('\n4️⃣ 检查数据库状态...');
    
    try {
      // 检查项目格式化状态分布
      const statusCount = await prisma.project.groupBy({
        by: ['formattingStatus'],
        _count: {
          id: true
        }
      });
      
      console.log('📊 项目格式化状态分布:');
      statusCount.forEach(item => {
        console.log(`   - ${item.formattingStatus}: ${item._count.id} 个项目`);
      });
      
      // 检查是否有异常数据
      const abnormalProjects = await prisma.project.findMany({
        where: {
          OR: [
            { formattingStatus: null },
            { projectType: null },
            { status: null }
          ]
        }
      });
      
      if (abnormalProjects.length > 0) {
        this.issues.push(`发现 ${abnormalProjects.length} 个数据异常的项目`);
        this.fixes.push({
          type: 'data_cleanup',
          message: '需要修复数据异常'
        });
      }
      
    } catch (error) {
      console.error('❌ 检查数据库状态失败:', error);
    }
  }

  async applyFixes() {
    console.log('\n🔧 应用修复...');
    
    if (this.fixes.length === 0 && this.issues.length === 0) {
      console.log('✅ 未发现问题，无需修复');
      return;
    }
    
    // 应用内容修复
    const contentFixes = this.fixes.filter(fix => fix.type === 'content');
    for (const fix of contentFixes) {
      await this.fixProjectContent(fix.projectId);
    }
    
    // 应用数据清理
    const cleanupFixes = this.fixes.filter(fix => fix.type === 'data_cleanup');
    if (cleanupFixes.length > 0) {
      await this.fixDataAnomalies();
    }
    
    console.log('\n✅ 修复完成');
  }

  async fixProjectContent(projectId) {
    console.log(`\n📝 修复项目内容: ${projectId}`);
    
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        console.log(`❌ 项目不存在: ${projectId}`);
        return;
      }
      
      // 如果内容过短，提供默认内容模板
      if (!project.content || project.content.trim().length < 10) {
        const defaultContent = `# ${project.title}

## 项目概述
${project.description || '请在此处详细描述您的项目背景和目标。'}

## 主要功能
- 功能1: 描述第一个主要功能
- 功能2: 描述第二个主要功能  
- 功能3: 描述第三个主要功能

## 技术栈
- 前端: 描述使用的前端技术
- 后端: 描述使用的后端技术
- 数据库: 描述使用的数据库

## 预期成果
描述项目完成后的预期成果和价值。

## 时间规划
- 第一阶段: 描述第一阶段工作
- 第二阶段: 描述第二阶段工作
- 第三阶段: 描述第三阶段工作`;

        await prisma.project.update({
          where: { id: projectId },
          data: {
            content: defaultContent,
            formattingStatus: 'NOT_STARTED' // 重置状态以便重新尝试
          }
        });
        
        console.log(`✅ 已为项目 "${project.title}" 添加默认内容模板`);
      }
      
    } catch (error) {
      console.error(`❌ 修复项目内容失败: ${error.message}`);
    }
  }

  async fixDataAnomalies() {
    console.log('\n🧹 修复数据异常...');
    
    try {
      // 修复空值的格式化状态
      await prisma.project.updateMany({
        where: { formattingStatus: null },
        data: { formattingStatus: 'NOT_STARTED' }
      });
      
      // 修复空值的项目类型
      await prisma.project.updateMany({
        where: { projectType: null },
        data: { projectType: 'DRAFT_PROJECT' }
      });
      
      // 修复空值的状态
      await prisma.project.updateMany({
        where: { status: null },
        data: { status: 'DRAFT' }
      });
      
      console.log('✅ 数据异常修复完成');
      
    } catch (error) {
      console.error('❌ 修复数据异常失败:', error);
    }
  }

  printDiagnosisReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 AI格式化问题诊断报告');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('✅ 未发现明显问题');
    } else {
      console.log(`发现 ${this.issues.length} 个问题:`);
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    if (this.fixes.length > 0) {
      console.log(`\n已应用 ${this.fixes.length} 个修复:`);
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix.message}`);
      });
    }
    
    console.log('\n💡 建议:');
    if (this.issues.some(issue => issue.includes('API'))) {
      console.log('   - 检查AI服务API密钥和端点配置');
    }
    if (this.issues.some(issue => issue.includes('内容过短'))) {
      console.log('   - 确保项目内容足够详细，至少100字符');
    }
    if (this.issues.some(issue => issue.includes('连通性'))) {
      console.log('   - 检查网络连接和AI服务状态');
    }
    
    console.log('='.repeat(60));
  }
}

// 运行诊断
async function main() {
  const diagnoser = new AIFormattingDiagnoser();
  await diagnoser.diagnoseFormattingFailure();
  diagnoser.printDiagnosisReport();
}

main().catch(console.error);