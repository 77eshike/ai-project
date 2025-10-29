const fs = require('fs');

console.log('🔍 验证注册API修复...\n');

const content = fs.readFileSync('./src/pages/api/auth/register.js', 'utf8');

// 检查注释
if (content.includes('status 是 Boolean 类型，使用 true')) {
  console.log('❌ 注释仍然错误：说status是Boolean类型');
} else if (content.includes('status 是 String 类型，使用 "ACTIVE"')) {
  console.log('✅ 注释正确：说status是String类型');
} else {
  console.log('⚠️ 未找到相关注释');
}

// 检查代码
if (content.includes('status: true,')) {
  console.log('❌ 代码仍然错误：status: true');
} else if (content.includes('status: "ACTIVE",')) {
  console.log('✅ 代码正确：status: "ACTIVE"');
} else {
  console.log('⚠️ 未找到status字段');
}

// 检查userData部分
const userDataMatch = content.match(/const userData = \{([^}]+)\}/);
if (userDataMatch) {
  console.log('\n📋 userData 内容:');
  console.log(userDataMatch[0]);
}
