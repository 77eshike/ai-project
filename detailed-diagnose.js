const { PrismaClient } = require('@prisma/client');

async function diagnose() {
  console.log('🔍 详细诊断...\n');
  
  try {
    const prisma = new PrismaClient();
    
    // 1. 检查数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接正常');
    
    // 2. 检查表结构
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    console.log('📋 用户表结构:');
    console.table(tableInfo);
    
    // 3. 测试创建用户
    console.log('\n🧪 测试用户创建...');
    const testData = {
      email: `diagnose-${Date.now()}@example.com`,
      password: 'hashed_test_password',
      name: 'Diagnose User',
      emailVerified: new Date(),
      status: "ACTIVE",
      role: "USER",
      image: null
    };
    
    console.log('测试数据:', JSON.stringify(testData, null, 2));
    
    const user = await prisma.user.create({
      data: testData,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
        createdAt: true
      }
    });
    
    console.log('✅ 用户创建成功:', user);
    
    // 4. 清理测试数据
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ 测试数据已清理');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.log('❌ 诊断失败:');
    console.log('   错误:', error.message);
    console.log('   代码:', error.code);
    if (error.meta) {
      console.log('   元数据:', error.meta);
    }
  }
}

diagnose();
