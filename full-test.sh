#!/bin/bash
echo "🔍 完整功能测试..."
echo ""

# 1. 环境变量测试
echo "1. 环境变量测试:"
curl -s https://191413.ai/api/env-test | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data['success']:
    env = data['data']
    print('   ✅ NEXTAUTH_SECRET:', env['NEXTAUTH_SECRET'])
    print('   ✅ DATABASE_URL:', env['DATABASE_URL'])
    print('   ✅ DEEPSEEK_API_KEY:', env['DEEPSEEK_API_KEY'])
    print('   ✅ NEXTAUTH_URL:', env['NEXTAUTH_URL'])
    print('   ✅ 所有必需变量:', env['hasAllRequired'])
else:
    print('   ❌ 环境变量测试失败')
"

# 2. 健康检查
echo "2. 健康检查:"
curl -s https://191413.ai/api/health | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('   状态:', data.get('status'))
print('   成功:', data.get('success'))
"

# 3. 数据库连接测试
echo "3. 数据库连接测试:"
curl -s https://191413.ai/api/debug/database | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data['success']:
    db = data['data']
    print('   ✅ 连接状态:', db.get('connection'))
    print('   ✅ 用户数:', db.get('userCount', 0))
    print('   ✅ 项目数:', db.get('projectCount', 0))
    print('   ✅ 知识点数:', db.get('knowledgeCount', 0))
else:
    print('   ❌ 数据库测试失败:', data.get('error', '未知错误'))
"

# 4. 项目API测试（需要认证）
echo "4. 项目API认证测试:"
curl -s -o /dev/null -w "%{http_code}" https://191413.ai/api/projects
status_code=$?
if [ $status_code -eq 401 ]; then
    echo "   ✅ 认证保护正常 (401 Unauthorized)"
else
    echo "   ❌ 认证异常，状态码: $status_code"
fi

# 5. 首页访问测试
echo "5. 首页访问测试:"
curl -s -o /dev/null -w "%{http_code}" https://191413.ai
status_code=$?
if [ $status_code -eq 200 ] || [ $status_code -eq 302 ]; then
    echo "   ✅ 首页访问正常 (HTTP $status_code)"
else
    echo "   ❌ 首页访问异常 (HTTP $status_code)"
fi

echo ""
echo "🎯 测试完成！"
