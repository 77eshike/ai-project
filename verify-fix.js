const { PrismaClient } = require('@prisma/client');

async function verify() {
  console.log('🔍 验证数据库字段修复...');
  
  try {
    const prisma = new PrismaClient();
    
    // 检查字段类型
    const userFields = prisma.user.fields;
    console.log('status 字段类型:', userFields.status?.typeName);
    console.log('role 字段类型:', userFields.role?.typeName);
    console.log('role 是否必需:', !userFields.role?.isRequired);
    
    // 测试创建用户
    const testUser = await prisma.user.create({
      data: {
        email: 'verify@example.com',
        password: 'hashed_password',
        name: 'Verify User',
        status: 'ACTIVE',
        role: 'USER'
      }
    });
    
    console.log('✅ 用户创建成功:', testUser.email);
    console.log('✅ status 值:', testUser.status, '(类型:', typeof testUser.status, ')');
    console.log('✅ role 值:', testUser.role, '(类型:', typeof testUser.role, ')');
    
    // 清理测试数据
    await prisma.user.delete({ where: { id: testUser.id } });
    
    await prisma.$disconnect();
    console.log('🎉 所有验证通过！');
    
  } catch (error) {
    console.log('❌ 验证失败:', error.message);
  }
}

verify();
