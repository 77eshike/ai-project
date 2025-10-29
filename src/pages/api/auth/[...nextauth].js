// src/pages/api/auth/[...nextauth].js - 完整修复版本
import NextAuth from 'next-auth'
import { authOptions } from '../../../lib/auth'

// 关键修复：简化配置，移除可能导致问题的选项
export default NextAuth({
  ...authOptions,
  // 确保 session 配置正确
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30天
    updateAge: 24 * 60 * 60, // 24小时
  },
  // 简化事件处理
  events: {
    signOut: async (message) => {
      console.log('用户登出事件触发');
    },
  },
  // 页面配置
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
    error: '/auth/error',
  },
  // 调试模式
  debug: process.env.NODE_ENV === 'development',
})

export { getServerSession } from 'next-auth/next'