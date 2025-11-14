// /src/lib/auth.js - 完整用户信息修复版本
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions = {
  // 🔧 JWT策略：使用Prisma适配器但强制JWT
  adapter: PrismaAdapter(prisma),
  
  session: {
    strategy: 'jwt', // 明确使用JWT策略
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60, // 24小时更新一次session
  },
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('🔐 JWT认证请求:', credentials.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ 缺少邮箱或密码');
            return null;
          }
          
          // 🔧 关键修复：查询完整的用户信息
          const user = await prisma.user.findUnique({
            where: { 
              email: credentials.email.toLowerCase().trim()
            },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              image: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              lastLoginAt: true,
              emailVerified: true,
              preferences: true
            }
          });
          
          if (!user) {
            console.log('❌ 用户不存在:', credentials.email);
            return null;
          }
          
          if (!user.password) {
            console.log('❌ 用户没有密码:', user.id);
            return null;
          }
          
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.log('❌ 密码验证失败');
            return null;
          }
          
          // 🔧 更新最后登录时间
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          });
          
          console.log('✅ JWT认证成功，用户ID:', user.id, '类型:', typeof user.id);
          
          // 🔧 关键修复：返回完整的用户信息
          return {
            id: String(user.id), // 强制转换为字符串
            email: user.email,
            name: user.name || user.email.split('@')[0],
            role: user.role || 'USER',
            image: user.image,
            status: user.status || 'ACTIVE',
            createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
            lastLoginAt: user.lastLoginAt?.toISOString() || null,
            emailVerified: user.emailVerified?.toISOString() || null,
            preferences: user.preferences || {}
          };
        } catch (error) {
          console.error('JWT认证错误:', error);
          return null;
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      console.log('🔐 JWT回调 - 输入:', {
        hasUser: !!user,
        userId: user?.id,
        userIdType: typeof user?.id,
        tokenId: token.id,
        tokenIdType: typeof token.id,
        tokenSub: token.sub
      });
      
      // 🔧 关键修复：用户登录时设置完整信息
      if (user) {
        token.id = String(user.id); // 确保是字符串
        token.sub = String(user.id); // sub字段也设置
        token.role = user.role;
        token.status = user.status;
        token.image = user.image;
        token.createdAt = user.createdAt;
        token.updatedAt = user.updatedAt;
        token.lastLoginAt = user.lastLoginAt;
        token.emailVerified = user.emailVerified;
        token.preferences = user.preferences;
        console.log('✅ JWT设置完整用户信息:', {
          id: token.id,
          role: token.role,
          status: token.status,
          createdAt: token.createdAt
        });
      }
      
      // 🔧 关键修复：处理session更新
      if (trigger === "update" && session?.user?.id) {
        token.id = String(session.user.id);
        token.sub = String(session.user.id);
        
        // 如果有更新的用户信息，也更新到token中
        if (session.user.role) token.role = session.user.role;
        if (session.user.status) token.status = session.user.status;
        if (session.user.image) token.image = session.user.image;
        if (session.user.lastLoginAt) token.lastLoginAt = session.user.lastLoginAt;
        
        console.log('✅ JWT更新用户信息:', token.id);
      }
      
      console.log('🔐 JWT回调 - 输出:', {
        tokenId: token.id,
        tokenIdType: typeof token.id,
        tokenSub: token.sub,
        tokenRole: token.role,
        tokenStatus: token.status,
        tokenCreatedAt: token.createdAt
      });
      
      return token;
    },
    
    async session({ session, token, user }) {
      console.log('🔐 Session回调 - 输入:', {
        sessionUser: session.user,
        sessionUserKeys: Object.keys(session.user),
        tokenId: token.id,
        tokenIdType: typeof token.id,
        tokenSub: token.sub
      });
      
      // 🔧 关键修复：确保session.user包含所有必要字段
      if (token) {
        // 确保session.user对象存在
        if (!session.user) {
          session.user = {};
        }
        
        // 🔧 关键修复：设置完整的用户信息
        session.user.id = token.id || token.sub;
        session.user.email = token.email || session.user.email;
        session.user.name = token.name || session.user.name;
        session.user.role = token.role || session.user.role || 'USER';
        session.user.image = token.image || session.user.image;
        session.user.status = token.status || session.user.status || 'ACTIVE';
        session.user.createdAt = token.createdAt || session.user.createdAt;
        session.user.updatedAt = token.updatedAt || session.user.updatedAt;
        session.user.lastLoginAt = token.lastLoginAt || session.user.lastLoginAt;
        session.user.emailVerified = token.emailVerified || session.user.emailVerified;
        session.user.preferences = token.preferences || session.user.preferences || {};
        
        console.log('✅ Session设置完成:', {
          sessionUserId: session.user.id,
          sessionUserRole: session.user.role,
          sessionUserStatus: session.user.status,
          sessionUserCreatedAt: session.user.createdAt,
          sessionUserKeys: Object.keys(session.user)
        });
      } else {
        console.error('❌ Session回调：token为空');
      }
      
      console.log('🔐 Session回调 - 输出:', {
        sessionUserId: session.user.id,
        sessionUserIdType: typeof session.user.id,
        sessionUserEmail: session.user.email,
        sessionUserRole: session.user.role,
        sessionUserStatus: session.user.status,
        sessionUserCreatedAt: session.user.createdAt,
        sessionUserKeys: Object.keys(session.user)
      });
      
      return session;
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error'
  },
  
  // 🔧 增强配置
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  
  // 🔧 添加事件日志
  events: {
    async signIn(message) {
      console.log('🔐 用户登录:', {
        email: message.user.email,
        userId: message.user.id,
        timestamp: new Date().toISOString()
      });
    },
    async signOut(message) {
      console.log('🔐 用户登出:', {
        email: message.session?.user?.email,
        userId: message.session?.user?.id,
        timestamp: new Date().toISOString()
      });
    },
    async session(message) {
      console.log('🔐 Session事件:', {
        trigger: message.trigger,
        session: message.session?.user?.email,
        userId: message.session?.user?.id
      });
    }
  }
};

export default NextAuth(authOptions);