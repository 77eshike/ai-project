// ecosystem.accurate.js - 准确修复版本
module.exports = {
  apps: [{
    name: 'ai-project-accurate',
    cwd: '/opt/ai-project/.next/standalone',
    script: './server.js',
    
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '127.0.0.1',
      
      // 数据库配置
      DATABASE_URL: "postgresql://ai_user:Myd9961--==@localhost:5432/ai_project",
      
      // 认证配置
      NEXTAUTH_URL: "https://191413.ai",
      NEXTAUTH_SECRET: "14ffd30e5cc08d846a1693fdd8dec1ae3c9d58c4445bb1f29c60b3d1d5d22490",
      
      // Redis
      REDIS_URL: "redis://localhost:6379",
      
      // API Keys
      DEEPSEEK_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c",
      OPENAI_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c",
      OPENAI_BASE_URL: "https://api.deepseek.com/v1",
      
      // 公共 URL
      NEXT_PUBLIC_APP_URL: "https://191413.ai",
      
      // 启用详细日志
      DEBUG: "prisma:client",
      
      NODE_OPTIONS: '--max-old-space-size=1024 --no-deprecation --require /opt/ai-project/accurate-fix.js'
    },
    
    node_args: '--max-old-space-size=1024 --no-deprecation --require /opt/ai-project/accurate-fix.js',
    error_file: '/root/.pm2/logs/ai-project-accurate-error.log',
    out_file: '/root/.pm2/logs/ai-project-accurate-out.log',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    autorestart: true,
    restart_delay: 5000
  }]
}
