// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ai-project',
    script: 'npm',
    args: 'start',
    cwd: '/opt/ai-project',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/root/.pm2/logs/ai-project-error.log',
    out_file: '/root/.pm2/logs/ai-project-out.log',
    log_file: '/root/.pm2/logs/ai-project-combined.log',
    time: true
  }]
}