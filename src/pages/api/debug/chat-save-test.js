// pages/api/debug/chat-save-test.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: '未授权' });
    }

    const testData = {
      title: '测试聊天保存',
      content: '这是一个测试消息，用于验证聊天保存功能',
      category: '测试',
      tags: '测试,调试',
      source: 'chat'
    };

    console.log('🧪 开始聊天保存测试...');

    // 1. 测试数据库连接
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ 数据库连接正常');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      return res.status(500).json({ error: '数据库连接失败' });
    }

    // 2. 测试保存
    const result = await prisma.knowledge.create({
      data: {
        ...testData,
        userId: session.user.id,
        content: JSON.stringify([{ type: 'text', content: testData.content }])
      }
    });

    console.log('✅ 测试保存成功，ID:', result.id);

    // 3. 验证保存
    const verify = await prisma.knowledge.findUnique({
      where: { id: result.id }
    });

    if (verify) {
      console.log('✅ 数据验证成功');
      
      // 4. 清理测试数据
      await prisma.knowledge.delete({
        where: { id: result.id }
      });
      
      console.log('✅ 测试数据清理完成');
      
      res.status(200).json({
        success: true,
        message: '聊天保存功能正常',
        testId: result.id,
        verified: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: '数据验证失败'
      });
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}