#!/bin/bash
echo "🔍 最终诊断..."

cd /opt/ai-project

# 1. 清理环境
echo "1. 清理环境..."
find . -name "*.db" -type f -delete 2>/dev/null
rm -rf .next node_modules/.cache

# 2. 设置明确的环境变量
echo "2. 设置环境变量..."
export DATABASE_URL="file:./dev.db"
export PRISMA_SCHEMA=sqlite
export NODE_ENV=development

echo "DATABASE_URL: $DATABASE_URL"
echo "PRISMA_SCHEMA: $PRISMA_SCHEMA"

# 3. 生成 Prisma Client
echo "3. 生成 Prisma Client..."
npm run db:generate

# 4. 创建数据库表（带详细日志）
echo "4. 创建数据库表..."
npx prisma db push --schema=./prisma/schema.sqlite.prisma --force-reset

# 5. 检查结果
echo "5. 检查结果..."
echo "当前目录: $(pwd)"
echo "文件列表:"
ls -la | grep -E "(db$|sqlite)" || echo "没有数据库文件"

# 6. 如果失败，尝试手动创建
if [ ! -f "dev.db" ]; then
    echo "6. Prisma 失败，尝试手动创建..."
    sqlite3 dev.db "VACUUM;"
    npx prisma db push --schema=./prisma/schema.sqlite.prisma
fi

# 7. 最终检查
echo "7. 最终检查..."
if [ -f "dev.db" ]; then
    echo "✅ 数据库文件创建成功"
    echo "文件大小: $(ls -lh dev.db | awk '{print $5}')"
    echo "表列表:"
    sqlite3 dev.db ".tables" || echo "没有表"
else
    echo "❌ 数据库文件创建失败"
    echo "检查磁盘空间:"
    df -h .
    echo "检查权限:"
    ls -la | head -10
fi
