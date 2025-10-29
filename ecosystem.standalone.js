module.exports = {
  apps: [{
    name: 'ai-project',
    cwd: '/opt/ai-project/.next/standalone',
    script: '/opt/ai-project/.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
      NEXTAUTH_URL: 'http://43.228.124.126:3000',
      NEXTAUTH_SECRET: '14ffd30e5cc08d846a1693fdd8dec1ae3c9d58c4445bb1f29c60b3d1d5d22490',
      DATABASE_URL: "postgresql://ai_user:Myd9961--==@localhost:5432/ai_project",
      REDIS_URL: "redis://localhost:6379",
      DEEPSEEK_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c",
      OPENAI_API_KEY: "sk-f34261a9171441f5bbe16f2f40bf987c",
      OPENAI_BASE_URL: "https://api.deepseek.com/v1"
    },
    error_file: '/root/.pm2/logs/ai-project-error.log',
    out_file: '/root/.pm2/logs/ai-project-out.log',
    time: true,
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G'
  }]
}
