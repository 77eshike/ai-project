const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIdMatch() {
  const sessionUserId = "6"; // 从调试信息中获取的会话用户ID
  
  console.log('🔍 检查ID匹配情况:');
  console.log('会话中的用户ID:', sessionUserId, '(类型:', typeof sessionUserId, ')');
  
  try {
    // 尝试用字符串ID查找
    const userWithString = await prisma.user.findUnique({
      where: { id: sessionUserId }
    });
    console.log('✅ 使用字符串ID查找结果:', userWithString ? '找到用户' : '未找到用户');
    
    if (userWithString) {
      console.log('用户详情:', {
        id: userWithString.id,
        type: typeof userWithString.id,
        email: userWithString.email,
        status: userWithString.status
      });
    }

    // 检查所有用户的ID类型
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true },
      take: 10
    });
    
    console.log('📋 数据库中前10个用户的ID类型:');
    allUsers.forEach(user => {
      console.log(`  - ${user.email}: ID="${user.id}" (类型: ${typeof user.id})`);
    });

  } catch (error) {
    console.error('❌ 检查错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIdMatch();
