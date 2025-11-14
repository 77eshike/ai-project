const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  console.log('🔍 测试 Prisma 连接和查询...');
  
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn']
  });

  try {
    // 测试连接
    await prisma.$connect();
    console.log('✅ Prisma 连接成功');

    // 测试查询用户ID为"6"
    console.log('🔍 查询用户ID为"6"...');
    const user = await prisma.user.findUnique({
      where: { id: '6' },
      select: { id: true, email: true, status: true }
    });
    
    console.log('📊 查询结果:', user);
    
    if (user) {
      console.log('✅ 用户查询成功');
      console.log('  用户状态:', user.status);
      console.log('  ID类型:', typeof user.id);
      console.log('  状态类型:', typeof user.status);
    } else {
      console.log('❌ 用户查询失败 - 未找到用户');
    }

    // 测试更新最后登录时间
    console.log('🔍 测试更新操作...');
    const updatedUser = await prisma.user.update({
      where: { id: '6' },
      data: { lastLoginAt: new Date() },
      select: { id: true, lastLoginAt: true }
    });
    
    console.log('✅ 更新操作成功:', updatedUser);

  } catch (error) {
    console.error('❌ Prisma 测试错误:', error);
    console.error('错误详情:', {
      code: error.code,
      message: error.message,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Prisma 连接已关闭');
  }
}

testPrisma();
