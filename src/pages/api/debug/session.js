// /src/pages/api/debug/session.js
import { getServerSession } from 'next-auth/next';
import auth from '../../../lib/auth';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  try {
    const authOptions = auth?.authOptions || auth?.options || auth;
    const session = await getServerSession(req, res, authOptions);
    const token = await getToken({ req });
    
    res.status(200).json({
      success: true,
      session: {
        exists: !!session,
        user: session?.user || null,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        sessionKeys: session ? Object.keys(session) : [],
        userKeys: session?.user ? Object.keys(session.user) : []
      },
      token: {
        exists: !!token,
        id: token?.id || null,
        sub: token?.sub || null,
        email: token?.email || null,
        tokenKeys: token ? Object.keys(token) : []
      },
      headers: {
        authorization: req.headers.authorization ? '存在' : '不存在'
      }
    });
  } catch (error) {
    console.error('会话调试错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}