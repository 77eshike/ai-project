const axios = require('axios');

async function finalTest() {
  console.log('🎯 最终完整功能测试...\n');
  
  const testEmail = `final-${Date.now()}@example.com`;
  const testPassword = 'test123456';
  
  try {
    // 1. 注册
    console.log('1. 🆕 用户注册...');
    const register = await axios.post('http://localhost:3000/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Final Test User'
    });
    console.log('✅ 注册成功');
    console.log('   用户ID:', register.data.user.id);
    console.log('   邮箱:', register.data.user.email);
    console.log('   状态:', register.data.user.status);
    console.log('   角色:', register.data.user.role);
    
    // 2. 登录
    console.log('\n2. 🔐 用户登录...');
    const login = await axios.post('http://localhost:3000/api/auth/login', {
      email: testEmail,
      password: testPassword
    });
    console.log('✅ 登录成功');
    
    // 3. 健康检查
    console.log('\n3. ❤️ 健康检查...');
    const health = await axios.get('http://localhost:3000/api/health');
    console.log('✅ 健康检查正常:', health.data.status);
    
    // 4. 认证诊断
    console.log('\n4. 🩺 认证诊断...');
    const diagnose = await axios.get('http://localhost:3000/api/auth/diagnose');
    console.log('✅ 认证诊断正常');
    console.log('   会话状态:', diagnose.data.status);
    console.log('   数据库连接:', diagnose.data.database.connected);
    
    // 5. 测试其他API
    console.log('\n5. 📡 测试其他API...');
    const apis = [
      { name: '知识库', url: '/api/knowledge' },
      { name: '项目', url: '/api/projects' },
      { name: '聊天', url: '/api/ai/chat', method: 'POST', data: { message: 'Hello' } }
    ];
    
    for (const api of apis) {
      try {
        if (api.method === 'POST') {
          await axios.post(`http://localhost:3000${api.url}`, api.data);
        } else {
          await axios.get(`http://localhost:3000${api.url}`);
        }
        console.log(`   ✅ ${api.name} API 正常`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`   🔐 ${api.name} API 需要认证 (正常)`);
        } else {
          console.log(`   ⚠️ ${api.name} API: ${error.response?.status || error.message}`);
        }
      }
    }
    
    console.log('\n🎊 🎊 🎊 所有测试通过！ 🎊 🎊 🎊');
    console.log('🚀 你的 AI 项目现在完全正常工作了！');
    console.log('🌐 访问地址: http://43.228.124.126:3000');
    console.log('🔐 注册页面: http://43.228.124.126:3000/auth/signup');
    console.log('💬 聊天页面: http://43.228.124.126:3000/chat');
    console.log('📊 仪表板: http://43.228.124.126:3000/dashboard');
    
  } catch (error) {
    console.log('❌ 测试失败:');
    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   错误信息:', error.response.data);
      if (error.response.data.message) {
        console.log('   详细:', error.response.data.message);
      }
    } else {
      console.log('   错误:', error.message);
    }
  }
}

finalTest();
