// /opt/ai-project/src/pages/api/debug-auth.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置',
        urlsMatch: process.env.NEXTAUTH_URL === process.env.NEXT_PUBLIC_APP_URL
      },
      request: {
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers.host,
          'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
        }
      },
      cookies: {
        all: Object.keys(req.cookies),
        count: Object.keys(req.cookies).length,
        hasSessionToken: !!req.cookies['next-auth.session-token'],
        hasSecureSessionToken: !!req.cookies['__Secure-next-auth.session-token']
      },
      session: {
        user: session?.user || null,
        expires: session?.expires
      },
      diagnostics: {
        hasAuthOptions: !!authOptions,
        hasProviders: !!authOptions?.providers?.length,
        sessionStrategy: authOptions?.session?.strategy
      }
    };

    res.status(200).json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}