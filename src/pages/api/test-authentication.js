// pages/api/test-authentication.js
import { prisma } from "../../lib/prisma";
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  try {
    const { email, password } = req.body;
    
    console.log('🧪 直接认证测试:', { email: email?.substring(0, 5) + '***' });
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '邮箱和密码不能为空' 
      });
    }

    // 直接数据库验证
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        status: true
      }
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return res.status(401).json({ 
        success: false, 
        error: '用户不存在' 
      });
    }

    console.log('🔍 找到用户:', { 
      id: user.id, 
      email: user.email, 
      status: user.status 
    });

    if (user.status !== 'ACTIVE') {
      console.log('❌ 用户状态异常:', user.status);
      return res.status(401).json({ 
        success: false, 
        error: '用户状态异常: ' + user.status 
      });
    }

    if (!user.password) {
      console.log('❌ 用户密码未设置');
      return res.status(401).json({ 
        success: false, 
        error: '用户密码未设置' 
      });
    }

    console.log('🔑 开始密码验证...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log('🔑 密码验证结果:', isValid);
    
    if (!isValid) {
      console.log('❌ 密码验证失败');
      return res.status(401).json({ 
        success: false, 
        error: '密码错误' 
      });
    }

    console.log('✅ 直接认证成功');
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      message: '直接认证成功 - 说明数据库和密码验证正常'
    });

  } catch (error) {
    console.error('❌ 直接认证测试失败:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}