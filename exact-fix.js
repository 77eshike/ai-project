const fs = require('fs');

console.log('🔧 精确修复注册API...\n');

let content = fs.readFileSync('./src/pages/api/auth/register.js', 'utf8');

// 查找并修复 userData 中的 status 字段
const userDataPattern = /(const userData = \{[\s\S]*?status:\s*)true([\s\S]*?\})/;
if (userDataPattern.test(content)) {
  content = content.replace(userDataPattern, '$1"ACTIVE"$2');
  console.log('✅ 已修复 userData 中的 status: true → status: "ACTIVE"');
} else {
  console.log('❌ 未找到 userData 中的 status 字段');
}

// 查找并修复注释
content = content.replace(/\/\/ status 是 Boolean 类型，使用 true/, '// status 是 String 类型，使用 "ACTIVE"');

fs.writeFileSync('./src/pages/api/auth/register.js', content, 'utf8');
console.log('✅ 已更新注释');
console.log('🎉 修复完成！');
