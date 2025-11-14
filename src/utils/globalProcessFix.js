// src/utils/globalProcessFix.js - 最终稳定版本
(function() {
  if (typeof window !== 'undefined') {
    // 创建安全的 process 对象用于兼容性
    if (typeof process === 'undefined') {
      const hostname = window.location.hostname;
      const isDev = hostname === 'localhost' || 
                    hostname === '127.0.0.1' ||
                    hostname.includes('.local') ||
                    hostname.includes('192.168.') ||
                    /^127\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\./.test(hostname);
      
      window.process = {
        env: {
          NODE_ENV: isDev ? 'development' : 'production',
          NEXT_PUBLIC_NODE_ENV: isDev ? 'development' : 'production'
        },
        cwd: () => '/',
        version: '18.0.0',
        platform: 'browser',
        nextTick: (cb) => setTimeout(cb, 0)
      };
      
      if (isDev) {
        console.log('🔧 GlobalProcessFix: 已应用 process.env 兼容性修复', {
          NODE_ENV: window.process.env.NODE_ENV,
          hostname: hostname
        });
      }
    } else {
      // 如果 process 已经存在，确保它有必要的属性
      if (!process.env) {
        process.env = {};
      }
      if (!process.env.NODE_ENV) {
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || 
                      hostname === '127.0.0.1' ||
                      hostname.includes('.local');
        process.env.NODE_ENV = isDev ? 'development' : 'production';
      }
    }
  }
})();

export {};