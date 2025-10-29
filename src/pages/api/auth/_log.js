// src/pages/api/auth/_log.js
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 开发环境下记录日志
  if (process.env.NODE_ENV === 'development') {
    console.log('NextAuth Log:', req.body);
  }

  res.status(200).json({ success: true });
}