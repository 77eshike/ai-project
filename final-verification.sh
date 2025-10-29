#!/bin/bash
echo "🔍 最终验证检查..."

# 1. 检查构建状态
if [ -d ".next" ]; then
    echo "✅ .next 构建目录存在"
else
    echo "❌ .next 构建目录不存在"
fi

# 2. 检查PM2状态
pm2 status ai-project | grep -q "online"
if [ $? -eq 0 ]; then
    echo "✅ PM2 应用运行中"
else
    echo "❌ PM2 应用未运行"
fi

# 3. 测试API端点
echo "测试API端点..."
apis=("health" "projects" "debug/database")
for api in "${apis[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "https://191413.ai/api/$api")
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        echo "✅ /api/$api : HTTP $response"
    else
        echo "❌ /api/$api : HTTP $response"
    fi
done

# 4. 检查环境变量
echo "环境变量检查:"
if [ -n "$DATABASE_URL" ]; then
    echo "✅ DATABASE_URL 已设置"
else
    echo "❌ DATABASE_URL 未设置"
fi

if [ -n "$NEXTAUTH_SECRET" ]; then
    echo "✅ NEXTAUTH_SECRET 已设置"
else
    echo "❌ NEXTAUTH_SECRET 未设置"
fi

echo ""
echo "🎉 验证完成！"
