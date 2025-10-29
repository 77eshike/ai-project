const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 直接检查用户状态...');
    
    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { email: 'test@final.com' }
    });
    
    if (user) {
      console.log('✅ 用户存在:');
      console.log('  ID:', user.id);
      console.log('  邮箱:', user.email);
      console.log('  姓名:', user.name);
      console.log('  状态:', user.status);
      console.log('  角色:', user.role);
      console.log('  密码:', user.password ? '已设置' : '未设置');
      
      // 如果密码已设置，验证密码
      if (user.password) {
        const isValid = await bcrypt.compare('test123456', user.password);
        console.log('  密码验证:', isValid ? '✅ 正确' : '❌ 错误');
      }
    } else {
      console.log('❌ 用户不存在，正在创建...');
      const hashedPassword = await bcrypt.hash('test123456', 12);
      const newUser = await prisma.user.create({
        data: {
          email: 'test@final.com',
          password: hashedPassword,
          name: 'Test User',
          status: 'ACTIVE',
          role: 'USER',
          emailVerified: new Date()
        }
      });
      console.log('✅ 用户创建成功:', newUser.id);
    }
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
