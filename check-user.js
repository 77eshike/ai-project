const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 检查用户 test@final.com...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'test@final.com' },
      select: { 
        id: true, 
        email: true, 
        password: true, 
        status: true, 
        role: true, 
        createdAt: true,
        name: true
      }
    });
    
    if (user) {
      console.log('✅ 用户信息:');
      console.log('   - ID:', user.id);
      console.log('   - 邮箱:', user.email);
      console.log('   - 姓名:', user.name);
      console.log('   - 状态:', user.status);
      console.log('   - 角色:', user.role);
      console.log('   - 创建时间:', user.createdAt);
      console.log('   - 密码哈希:', user.password ? '已设置' : '未设置');
      
      if (user.password) {
        const isValid = await bcrypt.compare('test123456', user.password);
        console.log('   - 密码验证:', isValid ? '✅ 正确' : '❌ 错误');
        
        if (!isValid) {
          console.log('🔄 重置密码...');
          const newHash = await bcrypt.hash('test123456', 12);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: newHash }
          });
          console.log('✅ 密码已重置');
        }
      } else {
        console.log('🔄 设置密码...');
        const newHash = await bcrypt.hash('test123456', 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: newHash }
        });
        console.log('✅ 密码已设置');
      }
    } else {
      console.log('❌ 用户不存在');
      console.log('🔄 创建用户...');
      const newHash = await bcrypt.hash('test123456', 12);
      const newUser = await prisma.user.create({
        data: {
          email: 'test@final.com',
          password: newHash,
          name: 'Test User',
          status: 'ACTIVE',
          role: 'USER',
          emailVerified: new Date()
        }
      });
      console.log('✅ 用户已创建:', newUser.id);
    }
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
