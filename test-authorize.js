const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testAuthorize() {
  try {
    console.log('🔐 直接测试authorize逻辑...');
    
    const credentials = {
      email: 'test@final.com',
      password: 'test123456'
    };
    
    const user = await prisma.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        status: true
      }
    });

    console.log('用户查询结果:', user ? `找到用户: ${user.email}` : '用户不存在');

    if (user && user.password) {
      const isValid = await bcrypt.compare(credentials.password, user.password);
      console.log('密码验证:', isValid);
      
      if (isValid) {
        console.log('✅ authorize应该返回:', {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        });
      }
    }
  } catch (error) {
    console.error('测试错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthorize();
