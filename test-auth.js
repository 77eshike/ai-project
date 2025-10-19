// test-auth.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    // 1. 检查用户是否存在
    const users = await prisma.user.findMany();
    console.log('数据库中的用户:', users);
    
    // 2. 测试密码验证
    if (users.length > 0) {
      const user = users[0];
      const testPassword = 'adminpassword123'; // 与创建时使用的密码相同
      const isValid = await bcrypt.compare(testPassword, user.password);
      
      console.log('密码验证结果:', isValid);
      console.log('用户信息:', {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      });
    }
    
    // 3. 测试数据库查询性能
    const startTime = Date.now();
    const testQuery = await prisma.user.findMany();
    const endTime = Date.now();
    
    console.log(`数据库查询耗时: ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error('❌ 认证测试失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();