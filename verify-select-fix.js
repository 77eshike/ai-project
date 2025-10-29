const fs = require('fs');

console.log('🔍 验证select部分修复...\n');

const content = fs.readFileSync('./src/pages/api/auth/register.js', 'utf8');

// 检查select部分
const selectMatch = content.match(/select: \{([^}]+)\}/);
if (selectMatch) {
  console.log('📋 select 内容:');
  console.log(selectMatch[0]);
  
  if (selectMatch[0].includes('status: "ACTIVE"')) {
    console.log('❌ select 部分错误: status: "ACTIVE" (应该是 status: true)');
  } else if (selectMatch[0].includes('status: true')) {
    console.log('✅ select 部分正确: status: true');
  } else {
    console.log('❓ 未找到status字段');
  }
} else {
  console.log('❌ 未找到select对象');
}

// 检查data部分
const dataMatch = content.match(/data: userData/);
if (dataMatch) {
  console.log('\n✅ data 部分使用 userData 对象');
} else {
  console.log('\n❌ 未找到 data: userData');
}
