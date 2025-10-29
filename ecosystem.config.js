module.exports = {
  apps: [{
    name: 'ai-project',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=1024'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    error_file: '/root/.pm2/logs/ai-project-error.log',
    out_file: '/root/.pm2/logs/ai-project-out.log',
    log_file: '/root/.pm2/logs/ai-project-combined.log',
    time: true,
    env_file: '.env.production'
  }]
}
