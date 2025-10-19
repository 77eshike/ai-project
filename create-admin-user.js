// create-admin-user.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const hashedPassword = await bcrypt.hash('adminpassword123', 12);
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Administrator',
        password: hashedPassword
      }
    });
    
    console.log('✅ 管理员用户已创建:', adminUser);
    
  } catch (error) {
    console.error('❌ 创建用户失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();