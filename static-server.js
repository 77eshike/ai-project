// 静态资源服务中间件
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');

console.log('📁 加载静态资源服务...');

// 存储原始 createServer 方法
const originalCreateServer = createServer;

// 重写 createServer 以添加静态资源服务
module.exports = (req, res, next) => {
  const staticFiles = {
    '/favicon.ico': '/opt/ai-project/.next/standalone/public/favicon.ico',
    '/favicon-32x32.png': '/opt/ai-project/.next/standalone/public/favicon-32x32.png', 
    '/favicon-16x16.png': '/opt/ai-project/.next/standalone/public/favicon-16x16.png',
    '/site.webmanifest': '/opt/ai-project/.next/standalone/public/site.webmanifest',
    '/robots.txt': '/opt/ai-project/.next/standalone/public/robots.txt'
  };

  if (staticFiles[req.url]) {
    const filePath = staticFiles[req.url];
    
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.webmanifest': 'application/manifest+json',
        '.txt': 'text/plain'
      };
      
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400' // 缓存一天
      });
      
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      console.log(`❌ 静态文件不存在: ${filePath}`);
    }
  }
  
  // 如果不是静态文件请求，继续正常处理
  if (next) next();
};

// 全局应用中间件
const originalHandler = require('./server.js');
if (typeof originalHandler === 'function') {
  const patchedHandler = (req, res) => {
    // 先尝试静态资源服务
    module.exports(req, res, () => {
      // 如果不是静态资源，调用原始处理器
      originalHandler(req, res);
    });
  };
  
  // 替换导出
  require.cache[require.resolve('./server.js')].exports = patchedHandler;
  console.log('✅ 静态资源服务已启用');
}
