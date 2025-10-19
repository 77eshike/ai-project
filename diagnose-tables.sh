#!/bin/bash
echo "🔍 诊断表名..."

cd /opt/ai-project

echo "1. 所有表:"
sqlite3 dev.db ".tables"

echo "2. 表详细信息:"
sqlite3 dev.db "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view');"

echo "3. 表结构:"
sqlite3 dev.db ".schema"

echo "4. 使用 Prisma 检查:"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 检查用户
    const users = await prisma.user.findMany();
    console.log('Prisma 查询的用户数量:', users.length);
    
    // 检查表名
    const tables = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%user%';\`;
    console.log('包含 user 的表:', tables);
    
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}
main();
"
