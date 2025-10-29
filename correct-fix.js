const fs = require('fs');
const path = require('path');

// 需要修复的文件和正确的导入
const filesToFix = [
  {
    file: 'src/pages/api/users.js',
    imports: [
      "import prisma from '../../../lib/prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/pages/api/auth/[...nextauth].js', 
    imports: [
      "import { PrismaAdapter } from '@next-auth/prisma-adapter'",
      "import prisma from '../../../lib/prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/pages/api/ai/conversations.js',
    imports: [
      "import prisma from '../../../lib/prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/pages/api/ai/conversations/[id].js',
    imports: [
      "import prisma from '../../../../lib/prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]  
  },
  {
    file: 'src/pages/api/upload/[...nextauth].js',
    imports: [
      "import prisma from '../../../lib/prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/pages/api/simple-auth/login.js',
    imports: [
      "import prisma from '../../../lib/prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/lib/command-processor.js',
    imports: [
      "import prisma from './prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/lib/auth-minimal.js',
    imports: [
      "import prisma from './prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/lib/auth-v4-correct.js',
    imports: [
      "import { PrismaAdapter } from '@next-auth/prisma-adapter'",
      "import prisma from './prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/lib/auth-v4-simple.js',
    imports: [
      "import prisma from './prisma'"
    ],
    remove: ["const prisma = new PrismaClient()"]
  },
  {
    file: 'src/pages/api/ai/chat.js',
    imports: [
      "import prisma from '../../../lib/prisma'"
    ],
    remove: []
  }
];

filesToFix.forEach(({ file, imports, remove }) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // 移除旧的 PrismaClient 导入
    content = content.replace(/import { PrismaClient } from '@prisma\/client'/g, '');
    
    // 添加新的导入
    const importSection = imports.join('\n') + '\n\n';
    
    // 找到第一个导入语句的位置
    const firstImportIndex = content.search(/import\s+/);
    if (firstImportIndex !== -1) {
      // 在第一个导入前插入新的导入
      content = content.slice(0, firstImportIndex) + importSection + content.slice(firstImportIndex);
    } else {
      // 如果没有导入，添加到文件开头
      content = importSection + content;
    }
    
    // 移除 PrismaClient 实例化
    remove.forEach(pattern => {
      content = content.replace(new RegExp(pattern, 'g'), '');
    });
    
    // 替换 new PrismaClient() 的使用
    content = content.replace(/new PrismaClient\(\)/g, 'prisma');
    
    fs.writeFileSync(file, content);
    console.log(`✅ 修复: ${file}`);
  } else {
    console.log(`⚠️  文件不存在: ${file}`);
  }
});

console.log('🎉 正确修复完成！');
