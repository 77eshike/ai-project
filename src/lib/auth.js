// src/lib/auth.js
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// 使用全局变量避免热重载时创建多个 Prisma 实例
const globalForPrisma = globalThis
let prisma = globalForPrisma.prisma

if (!prisma) {
  prisma = new PrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('邮箱和密码不能为空')
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            throw new Error('用户不存在')
          }

          if (!user.password) {
            throw new Error('用户密码未设置')
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error('密码错误')
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name
          }
        } catch (error) {
          console.error('认证错误:', error.message)
          return null
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
    error: '/auth/error', // 错误页面
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // 如果您有用户角色，可以在这里添加
        // token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        // 如果您有用户角色，可以在这里添加
        // session.user.role = token.role
      }
      return session
    }
  },
  debug: process.env.NODE_ENV === 'development', // 仅在开发环境开启调试
}

export default NextAuth(authOptions)