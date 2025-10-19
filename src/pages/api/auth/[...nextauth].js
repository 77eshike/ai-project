// pages/api/auth/[...nextauth].js - 完整修复版本
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

// 修复Cookie配置 - 确保域名正确
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://');
const cookiePrefix = useSecureCookies ? '__Secure-' : '';
const hostName = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3001').hostname;

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('🔐 开始认证:', credentials.email);
          
          if (!credentials?.email || !credentials?.password) {
            throw new Error('邮箱和密码不能为空');
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
              image: true,
              emailVerified: true,
              role: true,
              status: true
            }
          });

          if (!user) {
            throw new Error('邮箱或密码错误');
          }

          if (!user.password) {
            throw new Error('该账户未设置密码，请使用其他登录方式');
          }

          if (user.status === 'BLOCKED') {
            throw new Error('您的账户已被禁用，请联系管理员');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('邮箱或密码错误');
          }

          console.log('✅ 认证成功:', user.email);
          
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image || null,
            role: user.role || 'USER',
            status: user.status || 'ACTIVE'
          };
        } catch (error) {
          console.error('❌ 认证错误:', error.message);
          throw new Error(error.message);
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // 用户登录时
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      // 将token中的信息添加到session中
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 允许相对URL重定向
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // 允许相同域名的重定向
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: hostName === 'localhost' ? undefined : `.${hostName}`
      }
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: hostName === 'localhost' ? undefined : `.${hostName}`
      }
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: hostName === 'localhost' ? undefined : `.${hostName}`
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);