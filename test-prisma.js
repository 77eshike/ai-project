const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient();
  
  try {
    console.log('测试 Prisma 连接...');
    
    // 测试连接
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log('数据库信息:', dbInfo[0]);
    
    // 测试写入
    const testEmail = `direct-test-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: 'direct-test',
        name: 'Direct Test User',
        emailVerified: new Date(),
        status: 'ACTIVE',
        role: 'USER'
      }
    });
    console.log('创建用户:', user);
    
    // 查询确认
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    console.log('查询用户:', found);
    
    // 查询所有用户
    const allUsers = await prisma.user.findMany({ 
      select: { id: true, email: true, name: true },
      orderBy: { id: 'desc' },
      take: 5
    });
    console.log('最近5个用户:', allUsers);
    
  } catch (error) {
    console.error('测试错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
