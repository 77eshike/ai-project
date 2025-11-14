#!/bin/bash

echo "🔍 验证冲突修复结果"
echo "===================="

# 检查进程
echo "1. 所有相关进程:"
ps aux | grep -E "(node|next)" | grep -v grep

echo ""
echo "2. 端口占用情况:"
sudo netstat -tlnp | grep :3000 || echo "✅ 没有端口冲突"

echo ""
echo "3. PM2 应用状态:"
pm2 status ai-project

echo ""
echo "4. 应用健康检查:"
APP_PID=$(pm2 pid ai-project)
if [ -n "$APP_PID" ]; then
    echo "✅ 应用运行中 (PID: $APP_PID)"
    echo "   内存: $(ps -p $APP_PID -o rss= | awk '{printf "%.1fMB", $1/1024}')"
    echo "   CPU: $(ps -p $APP_PID -o %cpu=)%"
else
    echo "❌ 应用未运行"
fi

echo ""
echo "5. 应用响应测试:"
RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)
if [ "$RESPONSE_CODE" = "200" ]; then
    echo "✅ 应用响应正常 (HTTP 200)"
else
    echo "❌ 应用响应异常 (HTTP $RESPONSE_CODE)"
fi

echo ""
echo "6. 检查重启次数:"
RESTARTS=$(pm2 show ai-project | grep "restarts" | awk '{print $4}')
if [ "$RESTARTS" -eq 0 ]; then
    echo "✅ 应用稳定运行 (重启次数: $RESTARTS)"
else
    echo "⚠️  应用有重启记录 (重启次数: $RESTARTS)"
fi

echo ""
if [ "$RESPONSE_CODE" = "200" ] && [ -n "$APP_PID" ]; then
    echo "🎉 修复成功！网站现在可以通过 https://191413.ai 访问"
else
    echo "❌ 修复未完成，请检查日志: pm2 logs ai-project"
fi
