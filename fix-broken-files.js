const fs = require('fs');

const brokenFiles = [
  'src/pages/api/users.js',
  'src/pages/api/auth/[...nextauth].js', 
  'src/pages/api/ai/conversations.js',
  'src/pages/api/ai/conversations/[id].js',
  'src/pages/api/upload/[...nextauth].js',
  'src/pages/api/simple-auth/login.js',
  'src/lib/command-processor.js',
  'src/lib/auth-minimal.js',
  'src/lib/auth-v4-correct.js',
  'src/lib/auth-v4-simple.js',
  'src/lib/prisma.js',
  'src/lib/prisma-safe.js'
];

brokenFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // 修复被破坏的导入
    if (content.includes('import prisma from .../../lib/prisma.')) {
      // 恢复原始内容
      if (file.includes('prisma.js') || file.includes('prisma-safe.js')) {
        content = `import { PrismaClient } from '@prisma/client'\n\n` + 
                 content.replace(/import prisma from \.\.\.\/\.\.\/lib\/prisma\./g, '');
      } else if (file.includes('auth.js') && file.includes('PrismaAdapter')) {
        content = `import { PrismaAdapter } from '@next-auth/prisma-adapter'\n` +
                 `import prisma from './prisma'\n` +
                 content.replace(/import prisma from \.\.\.\/\.\.\/lib\/prisma\./g, '')
                       .replace(/import { PrismaAdapter } from '@next-auth\/prisma-adapter'/g, '');
      } else {
        content = `import { PrismaClient } from '@prisma/client'\n\n` +
                 content.replace(/import prisma from \.\.\.\/\.\.\/lib\/prisma\./g, '');
      }
      
      fs.writeFileSync(file, content);
      console.log(`✅ 修复: ${file}`);
    } else {
      console.log(`ℹ️  无需修复: ${file}`);
    }
  }
});

console.log('🎉 文件恢复完成！');
