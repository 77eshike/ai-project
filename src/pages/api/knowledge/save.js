// pages/api/knowledge/save.js - 修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

// 标签处理工具函数
const processTags = (tags) => {
  if (!tags) return '';
  
  let tagArray = [];
  
  if (Array.isArray(tags)) {
    tagArray = tags;
  } else if (typeof tags === 'string') {
    tagArray = tags.split(',').map(tag => tag.trim());
  } else if (typeof tags === 'object') {
    console.warn('标签格式为对象，尝试转换:', tags);
    // 处理对象类型的tags - 提取所有字符串值
    if (Array.isArray(tags)) {
      tagArray = tags.map(tag => String(tag).trim());
    } else {
      tagArray = Object.values(tags)
        .filter(value => value !== null && value !== undefined)
        .map(value => String(value).trim());
    }
  }
  
  const cleanedTags = tagArray
    .map(tag => {
      if (typeof tag !== 'string') return '';
      return tag
        .replace(/[#*`\[\](){}【】《》""'']/g, '')
        .replace(/\n/g, ' ')
        .trim()
        .substring(0, 20);
    })
    .filter(tag => 
      tag.length > 0 && 
      tag.length <= 20 &&
      !/^[\d\s]+$/.test(tag)
    )
    .slice(0, 5);
  
  return cleanedTags.join(',');
};

// 自动分类函数
const determineCategory = (content, userCategory) => {
  if (userCategory && userCategory !== '所有') {
    return userCategory;
  }
  
  const contentText = Array.isArray(content) 
    ? content.map(item => item.content || '').join(' ')
    : String(content);
  
  const text = contentText.toLowerCase();
  
  const techKeywords = ['技术', '代码', '编程', 'react', 'javascript', 'python', 'java', '前端', '后端', '数据库', 'api', '接口', '部署', '服务器'];
  const productKeywords = ['产品', '设计', '用户体验', 'ui', 'ux', '原型', '需求', '功能', '交互'];
  const studyKeywords = ['学习', '知识', '教育', '教程', '课程', '学校', '考试', '复习'];
  const workKeywords = ['工作', '职业', '项目', '团队', '会议', '汇报', '管理'];
  
  const techCount = techKeywords.filter(keyword => text.includes(keyword)).length;
  const productCount = productKeywords.filter(keyword => text.includes(keyword)).length;
  const studyCount = studyKeywords.filter(keyword => text.includes(keyword)).length;
  const workCount = workKeywords.filter(keyword => text.includes(keyword)).length;
  
  const counts = [
    { category: '技术', count: techCount },
    { category: '产品', count: productCount },
    { category: '学习', count: studyCount },
    { category: '工作', count: workCount }
  ];
  
  const maxCount = Math.max(...counts.map(item => item.count));
  
  if (maxCount > 0) {
    return counts.find(item => item.count === maxCount).category;
  }
  
  return '通用';
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  // CORS 头设置
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    let userId = 1;
    if (session?.user?.id) {
      userId = parseInt(session.user.id, 10);
      if (isNaN(userId)) {
        console.warn('用户ID格式错误，使用默认值');
        userId = 1;
      }
    } else {
      console.warn('未找到用户会话，使用默认用户ID');
    }

    const { content, category, tags, source } = req.body;
    
    console.log('💾 保存知识点请求:', {
      userId,
      category,
      tagsType: typeof tags,
      tagsValue: tags,
      contentLength: Array.isArray(content) ? content.length : 0
    });

    // 数据验证
    if (!content) {
      return res.status(400).json({ 
        success: false,
        error: '内容不能为空' 
      });
    }

    // 处理内容格式
    let finalContent = '';
    try {
      if (Array.isArray(content)) {
        finalContent = JSON.stringify(content);
      } else if (typeof content === 'string') {
        try {
          JSON.parse(content);
          finalContent = content;
        } catch {
          finalContent = JSON.stringify([{ type: 'text', content: content }]);
        }
      } else {
        finalContent = JSON.stringify([{ type: 'text', content: String(content) }]);
      }
    } catch (error) {
      console.error('内容格式处理失败:', error);
      return res.status(400).json({ 
        success: false,
        error: '内容格式不正确' 
      });
    }

    // 处理分类
    const finalCategory = determineCategory(content, category);
    
    // 处理标签
    const finalTags = processTags(tags);

    console.log('🔧 处理后的数据:', {
      contentLength: finalContent.length,
      category: finalCategory,
      tags: finalTags
    });

    // 准备保存数据 - 只包含模型中存在的字段
    const knowledgeData = {
      content: finalContent,
      category: finalCategory,
      tags: finalTags,
      source: source || 'chat',
      userId: userId,
      // 注意：不包含 title 字段
    };

    console.log('📝 最终保存数据:', knowledgeData);

    // 保存到数据库
    const knowledge = await prisma.knowledge.create({
      data: knowledgeData,
    });

    console.log('✅ 知识点保存成功:', {
      id: knowledge.id,
      category: knowledge.category,
      tags: knowledge.tags
    });

    res.status(200).json({ 
      success: true, 
      knowledge: {
        id: knowledge.id,
        content: knowledge.content,
        category: knowledge.category,
        tags: knowledge.tags,
        createdAt: knowledge.createdAt
      },
      message: '知识点保存成功'
    });

  } catch (error) {
    console.error('❌ 保存知识点错误:', error);
    
    let errorMessage = '内部服务器错误';
    let statusCode = 500;

    if (error.message.includes('Unknown argument')) {
      errorMessage = '数据库字段不匹配，请检查数据模型';
      statusCode = 400;
    } else if (error.code === 'P2002') {
      errorMessage = '数据已存在';
      statusCode = 400;
    } else if (error.message.includes('prisma') || error.message.includes('database')) {
      errorMessage = '数据库连接错误';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}