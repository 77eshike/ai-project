// ecosystem.config.js - 完全修复版本
module.exports = {
  apps: [{
    name: 'ai-project',
    cwd: '/opt/ai-project/.next/standalone',
    script: 'server.js',  // 直接运行 server.js，不需要通过 node 命令
    
    env: {
      // 基础配置
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      
      // 认证配置
      NEXTAUTH_URL: "https://191413.ai",
      NEXTAUTH_SECRET: "14ffd30e5cc08d846a1693fdd8dec1ae3c9d58c4445bb1f29c60b3d1d5d22490",
      NEXT_PUBLIC_APP_URL: "https://191413.ai",
      
      // 数据库配置
      DATABASE_URL: "postgresql://ai_user:Myd9961--==@localhost:5432/ai_project?connection_limit=10&pool_timeout=30",
      
      // Redis配置
      REDIS_URL: "redis://localhost:6379",
      
      // AI API配置
      DEEPSEEK_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c",
      OPENAI_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c", 
      OPENAI_BASE_URL: "https://api.deepseek.com/v1",
      
      // Node.js 优化配置（移除了有问题的 --require）
      NODE_OPTIONS: '--max-old-space-size=512 --no-deprecation',
    },
    
    // Node.js 参数（移除了有问题的 --require）
    node_args: '--max-old-space-size=512 --no-deprecation',
    
    // 日志配置
    log_file: '/var/log/pm2/ai-project-combined.log',
    out_file: '/var/log/pm2/ai-project-out.log',
    error_file: '/var/log/pm2/ai-project-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 进程管理
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    autorestart: true,
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000,
  }]
}