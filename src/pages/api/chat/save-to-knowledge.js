// pages/api/chat/save-to-knowledge.js - 完整修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  // 设置响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    console.log('💾 从聊天保存知识点请求开始');
    
    // 用户认证
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      console.warn('🚫 未授权访问聊天保存端点');
      return res.status(401).json({ 
        success: false,
        error: '请先登录' 
      });
    }

    const userId = session.user.id;
    console.log('✅ 用户已认证:', userId);

    // 解析请求体
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('📦 请求体解析成功');
    } catch (e) {
      console.error('❌ JSON解析失败:', e);
      return res.status(400).json({ 
        success: false,
        error: '无效的JSON格式' 
      });
    }

    const { 
      title, 
      content, 
      category = 'AI对话', 
      tags = 'AI对话,聊天记录', 
      source = 'chat' 
    } = body;

    console.log('📋 接收到的数据:', {
      title: title?.substring(0, 50),
      contentLength: content?.length,
      category,
      tags,
      source
    });

    // 基本验证
    if (!content) {
      console.warn('❌ 内容为空');
      return res.status(400).json({ 
        success: false,
        error: '内容不能为空' 
      });
    }

    // 🔧 关键修复：改进内容处理逻辑
    let processedContent;
    try {
      if (typeof content === 'string') {
        // 如果是字符串，检查是否是JSON
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            processedContent = JSON.stringify(parsed);
            console.log('✅ 内容已是数组格式');
          } else {
            // 单个对象转换为数组
            processedContent = JSON.stringify([parsed]);
            console.log('✅ 单个对象转换为数组格式');
          }
        } catch (e) {
          // 不是JSON，创建标准格式
          processedContent = JSON.stringify([{ 
            type: 'text', 
            content: content.trim() 
          }]);
          console.log('✅ 纯文本转换为标准格式');
        }
      } else if (Array.isArray(content)) {
        // 直接使用数组
        processedContent = JSON.stringify(content);
        console.log('✅ 直接使用数组内容');
      } else if (typeof content === 'object') {
        // 单个消息对象
        processedContent = JSON.stringify([content]);
        console.log('✅ 对象内容转换为数组');
      } else {
        // 其他类型转换为字符串
        processedContent = JSON.stringify([{ 
          type: 'text', 
          content: String(content).trim() 
        }]);
        console.log('✅ 其他类型转换为标准格式');
      }
    } catch (e) {
      console.error('❌ 内容处理失败:', e);
      // 降级处理
      processedContent = JSON.stringify([{ 
        type: 'text', 
        content: String(content).substring(0, 10000) 
      }]);
    }

    // 清理和验证数据
    const cleanData = {
      title: (title?.trim() || `聊天记录 ${new Date().toLocaleString('zh-CN')}`).substring(0, 255),
      content: processedContent,
      category: (category || 'AI对话').trim().substring(0, 100),
      tags: (tags || 'AI对话,聊天记录').trim().substring(0, 500),
      source: (source || 'chat').trim().substring(0, 50),
      userId: userId
    };

    console.log('🧹 清理后的数据:', {
      title: cleanData.title,
      contentLength: cleanData.content.length,
      category: cleanData.category,
      tags: cleanData.tags,
      source: cleanData.source,
      userId: cleanData.userId
    });

    // 🔧 关键修复：改进的数据库操作
    let result;
    try {
      console.log('💾 开始保存到数据库...');
      
      result = await prisma.knowledge.create({
        data: cleanData
      });
      
      console.log('✅ 数据库保存成功，ID:', result.id);
      
      // 验证数据确实保存了
      const verifyRecord = await prisma.knowledge.findUnique({
        where: { id: result.id }
      });
      
      if (verifyRecord) {
        console.log('✅ 数据验证成功，记录已持久化');
      } else {
        console.error('❌ 数据验证失败，记录未找到');
        throw new Error('数据保存后验证失败');
      }
      
    } catch (dbError) {
      console.error('❌ 数据库保存失败:', {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta
      });
      
      if (dbError.code === 'P2002') {
        return res.status(400).json({ 
          success: false,
          error: '类似内容已存在',
          code: 'DUPLICATE_ENTRY'
        });
      } else if (dbError.code === 'P2003') {
        return res.status(400).json({ 
          success: false,
          error: '用户不存在',
          code: 'USER_NOT_FOUND'
        });
      }
      
      return res.status(500).json({ 
        success: false,
        error: '数据库保存失败',
        code: dbError.code,
        message: dbError.message
      });
    }

    // 成功响应
    const responseData = {
      success: true,
      data: {
        id: result.id,
        title: result.title,
        content: result.content,
        category: result.category,
        tags: result.tags,
        source: result.source,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: '已成功保存到知识库'
    };

    console.log('🎉 聊天保存成功完成:', {
      knowledgeId: result.id,
      title: result.title
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ 聊天保存端点全局错误:', error);
    
    res.status(500).json({
      success: false,
      error: '保存失败，请稍后重试',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    });
  }
}