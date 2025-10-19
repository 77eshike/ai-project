// pages/api/auth/session-check.js - 新增会话检查API
import { getCurrentUser } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    console.log('🔐 会话健康检查请求');
    const user = await getCurrentUser(req, res);
    
    if (!user) {
      console.log('❌ 会话检查: 无效会话');
      return res.status(401).json({
        valid: false,
        sessionExpired: true,
        error: '会话无效'
      });
    }

    console.log('✅ 会话检查: 有效会话', { userId: user.id, email: user.email });
    
    res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 会话检查错误:', error);
    res.status(500).json({
      valid: false,
      error: '会话检查失败'
    });
  }
}