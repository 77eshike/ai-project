// /opt/ai-project/src/pages/api/auth/session.js - 使用相对路径
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../lib/auth' // 🔧 从 lib 导入

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔐 会话API请求:', {
      method: req.method,
      url: req.url,
      hasCookies: !!req.headers.cookie
    });

    const session = await getServerSession(req, res, authOptions);
    
    console.log('🔐 会话状态:', {
      authenticated: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    });

    res.status(200).json({
      authenticated: !!session,
      user: session?.user || null,
      expires: session?.expires
    });
  } catch (error) {
    console.error('❌ 会话API错误:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      authenticated: false,
      user: null
    });
  }
}