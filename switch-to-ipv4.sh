#!/bin/bash

echo "🔄 切换到 IPv4 绑定..."

cd /opt/ai-project

# 停止所有相关进程
pm2 delete ai-project 2>/dev/null || true
pm2 delete ai-project-ipv4 2>/dev/null || true
sudo pkill -f "node.*next" 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true

sleep 2

# 更新 ecosystem.config.js 使用 IPv4
cat > ecosystem.config.js << 'CONFIG'
module.exports = {
  apps: [{
    name: 'ai-project',
    cwd: '/opt/ai-project',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000 -H 127.0.0.1',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '127.0.0.1',
      NEXTAUTH_URL: "https://191413.ai",
      NEXTAUTH_SECRET: "14ffd30e5cc08d846a1693fdd8dec1ae3c9d58c4445bb1f29c60b3d1d5d22490",
      DATABASE_URL: "postgresql://ai_user:Myd9961%2D%2D%3D%3D@localhost:5432/ai_project",
      REDIS_URL: "redis://localhost:6379",
      DEEPSEEK_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c",
      OPENAI_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c",
      OPENAI_BASE_URL: "https://api.deepseek.com/v1",
      NEXT_PUBLIC_APP_URL: "https://191413.ai",
      NODE_OPTIONS: '--max-old-space-size=1024 --no-deprecation',
    },
    node_args: '--max-old-space-size=1024 --no-deprecation',
    error_file: '/root/.pm2/logs/ai-project-error.log',
    out_file: '/root/.pm2/logs/ai-project-out.log',
    log_file: '/root/.pm2/logs/ai-project-combined.log',
    time: true,
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    autorestart: true,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
}
CONFIG

# 启动应用
pm2 start ecosystem.config.js

echo "⏳ 等待应用启动..."
sleep 5

# 验证
echo "=== 验证 IPv4 绑定 ==="
netstat -tlnp | grep :3000

echo "=== 测试访问 ==="
curl -s -o /dev/null -w "状态码: %{http_code}\n" http://127.0.0.1:3000/

echo "=== PM2 状态 ==="
pm2 status ai-project

echo "✅ 切换完成！"
