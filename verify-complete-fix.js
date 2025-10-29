const fs = require('fs');

console.log('🔍 完整验证注册API修复...\n');

const content = fs.readFileSync('./src/pages/api/auth/register.js', 'utf8');

// 检查data部分
console.log('📋 data 部分检查:');
if (content.includes('status: "ACTIVE",')) {
  console.log('✅ data 部分正确: status: "ACTIVE"');
} else {
  console.log('❌ data 部分错误');
}

// 检查select部分
console.log('\n📋 select 部分检查:');
if (content.includes('status: true,')) {
  console.log('✅ select 部分正确: status: true');
} else if (content.includes('status: "ACTIVE"')) {
  console.log('❌ select 部分错误: status: "ACTIVE" (应该是 status: true)');
} else {
  console.log('⚠️ 未找到select中的status字段');
}

// 显示相关代码
console.log('\n📝 相关代码:');
const dataMatch = content.match(/data: userData,[^}]+select: \{[\s\S]*?\n      \}/);
if (dataMatch) {
  console.log(dataMatch[0]);
}
