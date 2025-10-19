#!/bin/bash
echo "=== 彻底清理PM2相关进程 ==="

echo "1. 检查PM2状态..."
pm2 list 2>/dev/null || echo "PM2未安装或未运行"

echo "2. 停止所有PM2进程..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

echo "3. 杀死PM2守护进程..."
pm2 kill 2>/dev/null
pkill -f pm2 2>/dev/null
pkill -f PM2 2>/dev/null

echo "4. 清理PM2临时文件..."
rm -f ~/.pm2/sock* 2>/dev/null
rm -f ~/.pm2/pub.sock 2>/dev/null
rm -f /root/.pm2/sock* 2>/dev/null
rm -f /root/.pm2/pub.sock 2>/dev/null

echo "5. 检查是否还有Node进程..."
ps aux | grep -E "(node|next|pm2)"

echo "6. 强制杀死所有Node进程..."
pkill -9 -f "node" 2>/dev/null

echo "7. 使用端口3001启动应用..."
PORT=3001 npm run start