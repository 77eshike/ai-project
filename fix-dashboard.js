const fs = require('fs');

const filePath = 'src/pages/dashboard.js';
let content = fs.readFileSync(filePath, 'utf8');

// 移除服务端的 prisma 导入和使用
content = content.replace(/import.*prisma.*from.*lib.*prisma.*\n?/g, '');
content = content.replace(/const.*=.*await prisma\..*\(.*\)\n?/g, '');
content = content.replace(/await prisma\..*\(.*\)/g, 'null');

// 添加客户端数据获取的注释
content = content.replace(/export async function getServerSideProps/, '// 数据在客户端获取\nexport async function getServerSideProps');

fs.writeFileSync(filePath, content);
console.log('✅ 修复了 dashboard.js');
