// test-db-connection.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // 测试数据库连接
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ 数据库连接成功');
    console.log('PostgreSQL 版本:', result[0].version);
    
    // 检查用户表
    const users = await prisma.user.findMany();
    console.log('用户数量:', users.length);
    
    // 如果有用户，显示第一个用户的信息
    if (users.length > 0) {
      console.log('第一个用户:', users[0]);
    }
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();