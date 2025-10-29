// /opt/ai-project/prisma/seed.js - 更新版本
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始插入种子数据...')
  
  try {
    // 检查是否已有用户
    const userCount = await prisma.user.count()
    let adminUser, testUser
    
    if (userCount === 0) {
      console.log('创建示例用户...')
      
      // 创建管理员用户
      const adminPassword = await bcrypt.hash('admin123', 12)
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@191413.ai',
          name: '系统管理员',
          password: adminPassword,
          emailVerified: new Date(),
        }
      })
      console.log('✅ 创建管理员用户:', adminUser.email)
      
      // 创建测试用户
      const testPassword = await bcrypt.hash('test123', 12)
      testUser = await prisma.user.create({
        data: {
          email: 'test@191413.ai',
          name: '测试用户',
          password: testPassword,
          emailVerified: new Date(),
        }
      })
      console.log('✅ 创建测试用户:', testUser.email)
    } else {
      console.log('ℹ️  数据库中已有用户数据，跳过用户创建')
      // 获取现有用户
      adminUser = await prisma.user.findFirst({ where: { email: 'admin@191413.ai' } })
      testUser = await prisma.user.findFirst({ where: { email: 'test@191413.ai' } })
    }
    
    // 🔧 新增：检查并创建项目数据
    console.log('检查项目数据...')
    const projectCount = await prisma.project.count()
    
    if (projectCount === 0 && adminUser) {
      console.log('创建示例项目...')
      
      // 创建示例项目
      const sampleProject = await prisma.project.create({
        data: {
          title: 'AI智能助手开发项目',
          description: '基于深度学习的智能对话助手开发',
          content: `# AI智能助手开发项目

## 项目概述
开发一个基于深度学习的智能对话助手，支持多轮对话和上下文理解。

## 技术栈
- 前端: Next.js, React
- 后端: Node.js, Prisma
- AI: DeepSeek API
- 数据库: PostgreSQL

## 项目阶段
1. 需求分析 ✅
2. 技术选型 ✅
3. 开发实施 🚧
4. 测试验收 ⏳
5. 部署上线 ⏳`,
          type: 'STANDARD_PROJECT',
          status: 'IN_PROGRESS',
          visibility: 'PUBLIC',
          ownerId: adminUser.id,
        }
      })
      console.log('✅ 创建示例项目:', sampleProject.title)
      
      // 添加项目成员
      if (testUser) {
        await prisma.projectMember.create({
          data: {
            projectId: sampleProject.id,
            userId: testUser.id,
            role: 'MEMBER'
          }
        })
        console.log('✅ 添加项目成员:', testUser.name)
      }
      
      // 创建第二个示例项目
      const draftProject = await prisma.project.create({
        data: {
          title: '知识管理系统优化',
          description: '优化现有知识管理系统的用户体验和功能',
          content: '项目规划中...',
          type: 'DRAFT_PROJECT',
          status: 'DRAFT',
          visibility: 'PRIVATE',
          ownerId: adminUser.id,
        }
      })
      console.log('✅ 创建草稿项目:', draftProject.title)
    } else {
      console.log('ℹ️  数据库中已有项目数据，跳过项目创建')
    }
    
    // 🔧 新增：检查并创建知识点数据
    console.log('检查知识点数据...')
    const knowledgeCount = await prisma.knowledge.count()
    
    if (knowledgeCount === 0 && adminUser) {
      console.log('创建示例知识点...')
      
      await prisma.knowledge.create({
        data: {
          title: 'Next.js 项目结构最佳实践',
          content: `Next.js 项目应该遵循清晰的结构：
- pages/ - 页面组件
- components/ - 可复用组件  
- lib/ - 工具函数和配置
- styles/ - 样式文件
- public/ - 静态资源`,
          category: '技术文档',
          tags: 'Next.js,项目结构,最佳实践',
          source: 'manual',
          userId: adminUser.id
        }
      })
      console.log('✅ 创建示例知识点')
    }
    
    // 检查其他表的数据
    const accountCount = await prisma.account.count()
    const sessionCount = await prisma.session.count()
    const fileCount = await prisma.file.count()
    const knowledgeCountFinal = await prisma.knowledge.count()
    const projectCountFinal = await prisma.project.count()
    const projectMemberCount = await prisma.projectMember.count()
    
    console.log(`
📊 数据库当前状态:
  用户: ${await prisma.user.count()} 个
  账户: ${accountCount} 个
  会话: ${sessionCount} 个
  文件: ${fileCount} 个
  知识点: ${knowledgeCountFinal} 个
  项目: ${projectCountFinal} 个
  项目成员: ${projectMemberCount} 个
    `)
    
    console.log('🎉 种子数据插入完成！')
    
  } catch (error) {
    console.error('❌ 种子数据插入错误:', error)
    
    // 如果是表不存在错误，提示运行迁移
    if (error.message.includes('does not exist') || error.message.includes('project')) {
      console.log('\n💡 提示: 数据库表可能不存在')
      console.log('💡 请先运行: npx prisma migrate dev --name add_projects_models')
    }
    
    throw error
  }
}

main()
  .catch((e) => {
    console.error('种子脚本执行失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })