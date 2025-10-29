const fs = require('fs');

console.log('🔧 手动修复注册API...\n');

const filePath = './src/pages/api/auth/register.js';
let content = fs.readFileSync(filePath, 'utf8');

// 查找 userData 对象
const userDataMatch = content.match(/const userData = \{([^}]+)\}/);
if (userDataMatch) {
  console.log('📋 当前 userData 内容:');
  console.log(userDataMatch[0]);
  
  // 检查 status 字段
  if (userDataMatch[0].includes('status: true')) {
    console.log('❌ 发现 status: true (应该是字符串)');
    
    // 修复 status 字段
    content = content.replace(/status:\s*true,?/, 'status: "ACTIVE",');
    console.log('✅ 已修复为 status: "ACTIVE"');
  } else if (userDataMatch[0].includes('status: "ACTIVE"')) {
    console.log('✅ status 字段已经是正确的字符串值');
  } else {
    console.log('❓ 未找到 status 字段');
  }
} else {
  console.log('❌ 未找到 userData 对象');
}

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('🎉 修复完成！');
