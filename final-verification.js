const axios = require('axios');

async function finalVerification() {
  console.log('🎯 最终验证测试...\n');
  
  const testEmail = `final-verify-${Date.now()}@example.com`;
  
  try {
    // 1. 测试注册
    console.log('1. 测试用户注册...');
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      email: testEmail,
      password: 'test123456',
      name: 'Final Verification User'
    });
    
    console.log('✅ 注册成功!');
    console.log('   用户ID:', registerResponse.data.user.id);
    console.log('   状态:', registerResponse.data.user.status);
    console.log('   角色:', registerResponse.data.user.role);
    
    // 2. 测试登录
    console.log('\n2. 测试用户登录...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: testEmail,
      password: 'test123456'
    });
    
    console.log('✅ 登录成功!');
    
    // 3. 测试知识库
    console.log('\n3. 测试知识库API...');
    const knowledgeResponse = await axios.get('http://localhost:3000/api/knowledge');
    console.log('✅ 知识库API正常');
    
    // 4. 测试聊天API
    console.log('\n4. 测试聊天API...');
    const chatResponse = await axios.post('http://localhost:3000/api/ai/chat', {
      message: 'Hello, test message'
    });
    console.log('✅ 聊天API正常');
    
    // 5. 测试健康检查
    console.log('\n5. 测试健康检查...');
    const healthResponse = await axios.get('http://localhost:3000/api/health');
    console.log('✅ 健康检查正常:', healthResponse.data.status);
    
    console.log('\n🎉 🎉 🎉 所有功能完全正常！问题已彻底解决！ 🎉 🎉 🎉');
    
  } catch (error) {
    console.log('❌ 验证失败:');
    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   错误信息:', error.response.data);
    } else {
      console.log('   错误:', error.message);
    }
  }
}

finalVerification();
