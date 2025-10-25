// lib/auth.js - 修复版本
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const globalForPrisma = globalThis
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 🔧 关键修复：统一使用 191413.ai 域名
const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://191413.ai';
};

export const authOptions = {
  // 🔧 关键修复：信任代理
  trustHost: true,
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://'),
  
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
          console.log('🔐 开始认证:', credentials.email)
          
          if (!credentials?.email || !credentials?.password) {
            throw new Error('邮箱和密码不能为空')
          }

          // 开发环境默认用户
          if (process.env.NODE_ENV === 'development') {
            if (credentials.email === 'admin@191413.ai' && credentials.password === 'admin123') {
              console.log('✅ 开发环境默认用户登录成功');
              return {
                id: '1',
                email: 'admin@191413.ai',
                name: '管理员',
                role: 'ADMIN'
              };
            }
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
          })

          if (!user) {
            throw new Error('邮箱或密码错误')
          }

          if (!user.password) {
            throw new Error('该账户未设置密码，请使用其他登录方式')
          }

          if (user.status === 'BLOCKED') {
            throw new Error('您的账户已被禁用，请联系管理员')
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error('邮箱或密码错误')
          }

          console.log('✅ 认证成功:', user.email)
          
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image || null,
            role: user.role || 'USER',
            status: user.status || 'ACTIVE'
          }
        } catch (error) {
          console.error('❌ 认证错误:', error.message)
          throw new Error(error.message)
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
    async jwt({ token, user, trigger, session }) {
      // 🔧 关键修复：只在必要时更新 token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.status = user.status
        token.lastUpdated = Date.now()
      }
      
      // 🔧 关键修复：只在明确触发更新时更新
      if (trigger === 'update' && session) {
        return { ...token, ...session }
      }
      
      return token
    },
    async session({ session, token }) {
      // 🔧 关键修复：简化会话数据
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.image = token.picture
        session.user.role = token.role
        session.user.status = token.status
        session.expires = token.expires
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      console.log('🔀 重定向调试:', { url, baseUrl });
      
      // 允许相对路径
      if (url.startsWith('/')) {
        return `${getBaseUrl()}${url}`;
      }
      
      // 允许相同域名的URL
      if (url.startsWith(getBaseUrl())) {
        return url;
      }
      
      // 默认返回基础URL
      return getBaseUrl();
    }
  },
  // 🔧 关键修复：Cookie配置 - 移除可能导致问题的配置
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
      }
    }
  },
  // 🔧 关键修复：完全禁用调试和事件日志
  debug: false,
  logger: undefined, // 完全禁用日志
}

// 🔧 关键修复：只导出必要的对象
export { prisma }