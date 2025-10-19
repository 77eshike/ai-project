// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始插入种子数据...')
  
  try {
    // 检查是否已有用户
    const userCount = await prisma.user.count()
    
    if (userCount === 0) {
      console.log('创建示例用户...')
      
      // 创建管理员用户
      const adminPassword = await bcrypt.hash('admin123', 12)
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@191413.ai',
          name: '系统管理员',
          password: adminPassword,
          emailVerified: new Date(),
          role: 'admin',
          status: true
        }
      })
      console.log('✅ 创建管理员用户:', adminUser.email)
      
      // 创建测试用户
      const testPassword = await bcrypt.hash('test123', 12)
      const testUser = await prisma.user.create({
        data: {
          email: 'test@191413.ai',
          name: '测试用户',
          password: testPassword,
          emailVerified: new Date(),
          role: 'user',
          status: true
        }
      })
      console.log('✅ 创建测试用户:', testUser.email)
      
      // 创建示例知识条目
      console.log('创建示例知识条目...')
      const sampleKnowledge = await prisma.knowledge.create({
        data: {
          content: JSON.stringify([
            { role: 'user', content: '什么是人工智能？' },
            { role: 'assistant', content: '人工智能是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的机器。' }
          ]),
          category: 'AI基础',
          tags: JSON.stringify(['人工智能', '基础概念']),
          source: 'manual',
          userId: adminUser.id
        }
      })
      console.log('✅ 创建示例知识条目:', sampleKnowledge.id)
      
      // 创建示例文件记录
      console.log('创建示例文件记录...')
      const sampleFile = await prisma.file.create({
        data: {
          userId: adminUser.id,
          filename: 'example.pdf',
          key: 'uploads/example.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          url: '/uploads/example.pdf'
        }
      })
      console.log('✅ 创建示例文件记录:', sampleFile.id)
    } else {
      console.log('ℹ️  数据库中已有用户数据，跳过种子数据创建')
    }
    
    // 检查所有表的数据
    const userCount = await prisma.user.count()
    const accountCount = await prisma.account.count()
    const sessionCount = await prisma.session.count()
    const fileCount = await prisma.file.count()
    const knowledgeCount = await prisma.knowledge.count()
    
    console.log(`
📊 数据库当前状态:
  用户: ${userCount} 个
  账户: ${accountCount} 个
  会话: ${sessionCount} 个
  文件: ${fileCount} 个
  知识条目: ${knowledgeCount} 个
    `)
    
    console.log('🎉 种子数据插入完成！')
    
  } catch (error) {
    console.error('❌ 种子数据插入错误:', error)
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