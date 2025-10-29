import { PrismaAdapter } from '@next-auth/prisma-adapter'
// 这个文件可以删除了，使用主 auth.js 文件
console.warn('⚠️ auth-v4-correct.js 已弃用，请使用 auth.js')
export { authOptions } from './auth'
