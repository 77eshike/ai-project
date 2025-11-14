// src/pages/api/knowledge/check-db.js - 数据库检查
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  try {
    console.log('🔍 检查数据库状态...');
    
    // 1. 检查连接
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ 数据库连接正常');
    
    // 2. 检查表是否存在
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📊 数据库表:', tables);
    
    // 3. 检查knowledge表结构
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Knowledge'
    `;
    console.log('📋 Knowledge表结构:', columns);
    
    // 4. 检查现有数据
    const count = await prisma.knowledge.count();
    console.log('📈 现有知识点数量:', count);
    
    res.status(200).json({
      success: true,
      database: {
        connected: true,
        tables: tables.map(t => t.table_name),
        knowledgeColumns: columns,
        knowledgeCount: count
      }
    });

  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
}