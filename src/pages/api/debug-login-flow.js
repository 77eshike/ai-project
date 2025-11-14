// pages/api/debug-login-flow.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  console.log('🔐 登录流程调试端点被调用');
  
  try {
    const { email = 'test@example.com', password = '123456' } = req.body;
    
    const debugSteps = {
      step1_db_connection: { status: 'pending', result: null },
      step2_user_lookup: { status: 'pending', result: null },
      step3_password_verification: { status: 'pending', result: null },
      step4_session_check: { status: 'pending', result: null }
    };

    // 步骤1: 数据库连接
    try {
      await prisma.$connect();
      debugSteps.step1_db_connection = { 
        status: 'success', 
        result: '数据库连接正常' 
      };
    } catch (error) {
      debugSteps.step1_db_connection = { 
        status: 'failed', 
        result: error.message 
      };
    }

    // 步骤2: 用户查找
    let user = null;
    if (debugSteps.step1_db_connection.status === 'success') {
      try {
        user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            status: true
          }
        });
        
        debugSteps.step2_user_lookup = {
          status: user ? 'success' : 'failed',
          result: user ? `找到用户: ${user.email}` : '用户不存在'
        };
      } catch (error) {
        debugSteps.step2_user_lookup = {
          status: 'failed',
          result: error.message
        };
      }
    }

    // 步骤3: 密码验证
    if (user && debugSteps.step2_user_lookup.status === 'success') {
      try {
        const isValid = await bcrypt.compare(password, user.password);
        debugSteps.step3_password_verification = {
          status: isValid ? 'success' : 'failed',
          result: isValid ? '密码验证成功' : '密码验证失败'
        };
      } catch (error) {
        debugSteps.step3_password_verification = {
          status: 'failed',
          result: error.message
        };
      }
    }

    // 步骤4: 会话检查
    try {
      const session = await getServerSession(req, res, authOptions);
      debugSteps.step4_session_check = {
        status: session ? 'success' : 'failed',
        result: session ? `会话存在，用户: ${session.user.email}` : '无会话'
      };
    } catch (error) {
      debugSteps.step4_session_check = {
        status: 'failed',
        result: error.message
      };
    }

    const result = {
      timestamp: new Date().toISOString(),
      credentials: {
        email: email.substring(0, 3) + '***',
        password: '***'
      },
      debugSteps,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL
      },
      issues: [],
      recommendations: []
    };

    // 分析问题
    if (debugSteps.step2_user_lookup.status === 'failed') {
      result.issues.push('❌ 用户查找失败');
      result.recommendations.push('检查用户数据是否存在');
    }

    if (debugSteps.step3_password_verification.status === 'failed') {
      result.issues.push('❌ 密码验证失败');
      result.recommendations.push('重置测试用户密码');
    }

    if (debugSteps.step4_session_check.status === 'failed') {
      result.issues.push('❌ 会话创建失败');
      result.recommendations.push('检查 NextAuth 配置和 Cookie 设置');
    }

    console.log('🔐 登录流程调试结果:', result);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ 登录流程调试失败:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}