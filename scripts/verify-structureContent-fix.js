const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyStructureContentFix() {
  console.log('🔍 验证 structureContent 修复...\n');
  
  try {
    // 1. 检查文件中的 structureContent 引用
    const fs = require('fs');
    const serviceFile = fs.readFileSync('/opt/ai-project/src/services/ProjectWorkflowService.js', 'utf8');
    
    if (serviceFile.includes('structureContent')) {
      console.log('❌ 文件中仍然存在 structureContent 引用');
      const lines = serviceFile.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('structureContent')) {
          console.log(`   第 ${index + 1} 行: ${line.trim()}`);
        }
      });
    } else {
      console.log('✅ 文件中没有 structureContent 引用');
    }
    
    // 2. 检查服务是否可以正常导入
    console.log('\n2️⃣ 检查服务导入...');
    try {
      const { ProjectWorkflowService } = require('../src/services/ProjectWorkflowService');
      console.log('✅ 服务导入成功');
      
      // 3. 测试格式化功能
      console.log('\n3️⃣ 测试格式化功能...');
      const project = await prisma.project.findFirst({
        where: {
          title: '演示数据1'
        }
      });
      
      if (project) {
        console.log(`📋 测试项目: ${project.title}`);
        
        // 重置状态
        await prisma.project.update({
          where: { id: project.id },
          data: {
            formattingStatus: 'NOT_STARTED'
          }
        });
        
        console.log('🔄 开始AI格式化测试...');
        const result = await ProjectWorkflowService.formatProjectWithAI(project.id, 'STANDARD');
        
        if (result.success) {
          console.log('🎉 AI格式化成功!');
          console.log(`   格式化状态: ${result.project.formattingStatus}`);
          console.log(`   生成内容长度: ${result.project.aiFormattedContent?.length || 0} 字符`);
          
          if (result.project.aiFormattedContent) {
            console.log(`   内容预览: ${result.project.aiFormattedContent.substring(0, 200)}...`);
          }
        } else {
          console.log('❌ AI格式化失败:', result.error);
          
          // 检查错误是否与 structureContent 相关
          if (result.error.includes('structureContent')) {
            console.log('🔧 错误仍然与 structureContent 相关，需要进一步修复');
          }
        }
      } else {
        console.log('⚠️ 找不到演示数据1项目');
      }
      
    } catch (importError) {
      console.error('❌ 服务导入失败:', importError.message);
      console.error('错误堆栈:', importError.stack);
    }
    
  } catch (error) {
    console.error('❌ 验证过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyStructureContentFix();
