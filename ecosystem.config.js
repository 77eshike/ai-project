module.exports = {
  apps: [{
    name: 'ai-project',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '。/log/pm2/ai-project-error.log',
    out_file: '。/log/pm2/ai-project-out.log',
    log_file: '。/log/pm2/ai-project-combined.log',
    time: true
  }]
};
