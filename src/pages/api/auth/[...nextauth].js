// src/pages/api/auth/[...nextauth].js - 修复版本
import NextAuth from 'next-auth'
import { authOptions } from '../../../lib/auth'

// 🔧 关键修复：创建完全优化的配置
const optimizedAuthOptions = {
  ...authOptions,
  // 🔧 完全禁用所有自动刷新
  events: undefined, // 禁用所有事件
  debug: false, // 完全禁用调试
  logger: undefined, // 完全禁用日志
}

// 🔧 关键修复：只默认导出 NextAuth 处理器
export default NextAuth(optimizedAuthOptions)

// 🔧 关键修复：单独导出 getServerSession
export { getServerSession } from 'next-auth/next'