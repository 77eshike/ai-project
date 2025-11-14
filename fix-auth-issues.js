const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAuthIssues() {
  try {
    console.log('🔧 开始修复认证问题...');
    
    // 1. 清除所有现有会话
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`🗑️ 已删除 ${deletedSessions.count} 个会话记录`);
    
    // 2. 检查用户表
    const users = await prisma.user.findMany({
      select: { id: true, email: true, status: true }
    });
    console.log(`👥 系统中有 ${users.length} 个用户`);
    
    // 3. 显示活跃用户
    const activeUsers = users.filter(u => u.status);
    console.log(`✅ 活跃用户: ${activeUsers.length}`);
    activeUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`);
    });
    
    console.log('🎉 修复完成！所有用户需要重新登录。');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuthIssues();
