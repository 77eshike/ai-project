// src/lib/auth.js - 完整修复版本
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const adapter = PrismaAdapter(prisma)

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  adapter: adapter,
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email', placeholder: 'example@email.com' },
        password: { label: '密码', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('邮箱和密码不能为空')
        }

        try {
          // 查找用户
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() }
          })

          if (!user) {
            throw new Error('用户不存在')
          }

          // 验证密码
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error('密码错误')
          }

          // 返回用户信息（排除密码）
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image
          }
        } catch (error) {
          console.error('认证错误:', error)
          throw new Error(error.message || '认证失败')
        }
      }
    })
  ],
  
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
    updateAge: 24 * 60 * 60, // 24小时
  },
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin?logout=success',
    error: '/auth/error',
  },
  
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.email = token.email
        session.user.name = token.name
        session.user.image = token.picture
      }
      return session
    },
    
    async redirect({ url, baseUrl }) {
      console.log('🔍 重定向检查:', { url, baseUrl });
      
      // 🔧 关键修复：允许所有登出相关的重定向
      if (url.includes('logout')) {
        console.log('✅ 允许登出重定向:', url);
        return url;
      }
      
      // 允许所有认证页面的重定向
      if (url.includes('/auth/')) {
        console.log('✅ 允许认证页面重定向:', url);
        return url;
      }
      
      // 如果URL已经是绝对URL，直接返回
      if (url.startsWith('http')) {
        console.log('✅ 已经是绝对URL:', url);
        return url;
      }
      
      // 默认情况下，构建绝对URL
      const redirectUrl = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
      console.log('🔀 构建重定向URL:', redirectUrl);
      return redirectUrl;
    }
  },
  
  events: {
    async signOut({ token, session }) {
      console.log('👋 用户退出登录事件触发:', token?.id)
    }
  },
  
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)