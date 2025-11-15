// /opt/ai-project/prisma/seed.js - 修复版本
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
          role: 'ADMIN', // 🔧 添加角色
          status: 'ACTIVE' // 🔧 添加状态
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
          role: 'USER', // 🔧 添加角色
          status: 'ACTIVE' // 🔧 添加状态
        }
      })
      console.log('✅ 创建测试用户:', testUser.email)
    } else {
      console.log('ℹ️  数据库中已有用户数据，跳过用户创建')
      // 获取现有用户
      adminUser = await prisma.user.findFirst({ where: { email: 'admin@191413.ai' } })
      testUser = await prisma.user.findFirst({ where: { email: 'test@191413.ai' } })
    }
    
    // 🔧 修复：使用新的项目模型字段
    console.log('检查项目数据...')
    const projectCount = await prisma.project.count()
    
    if (projectCount === 0 && adminUser) {
      console.log('创建示例项目...')
      
      // 创建正式项目示例
      const standardProject = await prisma.project.create({
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
          // 🔧 使用新的字段名和枚举值
          projectType: 'STANDARD_PROJECT',
          status: 'IN_PROGRESS',
          visibility: 'PUBLIC',
          ownerId: adminUser.id,
          // 🔧 新增字段的默认值
          allowPublicComments: true,
          currentReviewRound: 1,
          maxReviewRounds: 3,
          formattingStatus: 'NOT_STARTED'
        }
      })
      console.log('✅ 创建正式项目:', standardProject.title)
      
      // 添加项目成员
      if (testUser) {
        await prisma.projectMember.create({
          data: {
            projectId: standardProject.id,
            userId: testUser.id,
            role: 'MEMBER'
          }
        })
        console.log('✅ 添加项目成员:', testUser.name)
      }
      
      // 创建待定项目示例
      const draftProject = await prisma.project.create({
        data: {
          title: '知识管理系统优化',
          description: '优化现有知识管理系统的用户体验和功能',
          content: `# 知识管理系统优化

## 当前问题
- 用户界面不够直观
- 搜索功能不够强大
- 缺少协作功能
- 移动端体验不佳

## 优化方向
1. 重新设计用户界面
2. 增强搜索算法
3. 添加团队协作功能
4. 优化移动端体验

欢迎大家提出建议！`,
          // 🔧 使用新的字段名和枚举值
          projectType: 'DRAFT_PROJECT',
          status: 'IN_REVIEW', // 待定项目状态
          visibility: 'PUBLIC', // 待定项目默认公开
          ownerId: adminUser.id,
          // 🔧 新增字段的默认值
          allowPublicComments: true,
          currentReviewRound: 1,
          maxReviewRounds: 3,
          formattingStatus: 'NOT_STARTED'
        }
      })
      console.log('✅ 创建待定项目:', draftProject.title)
      
      // 为待定项目创建示例评论
      if (testUser) {
        await prisma.projectComment.create({
          data: {
            projectId: draftProject.id,
            userId: testUser.id,
            content: '建议增加标签分类功能，这样知识整理会更方便。',
            status: 'ACTIVE'
          }
        })
        console.log('✅ 为待定项目添加示例评论')
      }

      // 创建团队项目示例
      const teamProject = await prisma.project.create({
        data: {
          title: '跨平台移动应用开发',
          description: '开发支持iOS和Android的跨平台移动应用',
          content: '项目详细规划...',
          projectType: 'TEAM_PROJECT',
          status: 'RECRUITING', // 招募中
          visibility: 'PUBLIC',
          ownerId: adminUser.id,
          allowPublicComments: false,
          currentReviewRound: 1,
          maxReviewRounds: 2,
          formattingStatus: 'COMPLETED',
          aiFormattedContent: `# 跨平台移动应用开发

## 项目简介
开发一款支持iOS和Android平台的跨平台移动应用。

## 技术选型
- 框架: React Native
- 状态管理: Redux Toolkit
- 导航: React Navigation
- UI组件: NativeBase

## 招募岗位
- 前端开发工程师 (3名)
- UI/UX设计师 (1名)
- 后端开发工程师 (2名)
- 测试工程师 (1名)`
        }
      })
      console.log('✅ 创建团队项目:', teamProject.title)
    } else {
      console.log('ℹ️  数据库中已有项目数据，跳过项目创建')
    }
    
    // 创建知识点数据
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
- public/ - 静态资源

## 路由组织
使用文件系统路由，保持结构清晰。

## 组件组织
按功能模块组织组件，提高可维护性。`,
          category: '技术文档',
          tags: 'Next.js,项目结构,最佳实践',
          source: 'manual',
          userId: adminUser.id
        }
      })

      // 创建第二个知识点
      await prisma.knowledge.create({
        data: {
          title: 'AI项目开发流程',
          content: `AI项目开发通常包括以下阶段：

## 1. 需求分析
- 明确项目目标
- 确定技术可行性
- 制定项目范围

## 2. 数据准备
- 数据收集
- 数据清洗
- 数据标注

## 3. 模型开发
- 模型选择
- 训练调优
- 性能评估

## 4. 部署上线
- 模型部署
- 性能监控
- 持续优化`,
          category: '项目管理',
          tags: 'AI,开发流程,项目管理',
          source: 'manual',
          userId: adminUser.id
        }
      })
      console.log('✅ 创建示例知识点')
    }
    
    // 统计最终数据状态
    const accountCount = await prisma.account.count()
    const sessionCount = await prisma.session.count()
    const fileCount = await prisma.file.count()
    const knowledgeCountFinal = await prisma.knowledge.count()
    const projectCountFinal = await prisma.project.count()
    const projectMemberCount = await prisma.projectMember.count()
    const projectCommentCount = await prisma.projectComment.count()
    
    console.log(`
📊 数据库当前状态:
  用户: ${await prisma.user.count()} 个
  账户: ${accountCount} 个
  会话: ${sessionCount} 个
  文件: ${fileCount} 个
  知识点: ${knowledgeCountFinal} 个
  项目: ${projectCountFinal} 个
  项目成员: ${projectMemberCount} 个
  项目评论: ${projectCommentCount} 个
    `)
    
    console.log('🎉 种子数据插入完成！')
    
  } catch (error) {
    console.error('❌ 种子数据插入错误:', error)
    
    // 提供详细的错误信息
    if (error.message.includes('does not exist')) {
      console.log('\n💡 提示: 数据库表或枚举可能不存在')
      console.log('💡 请运行以下命令创建数据库结构:')
      console.log('   npx prisma migrate dev --name init')
    } else if (error.message.includes('ProjectType')) {
      console.log('\n💡 提示: 项目类型枚举不匹配')
      console.log('💡 请确保Prisma Schema已更新并运行迁移')
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