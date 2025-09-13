// test/api.test.js
const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'deploy@example.com', // 替换为您的邮箱
  password: 'your_password'    // 替换为您的密码
};

async function testLogin() {
  try {
    console.log('Testing login for user:', TEST_USER.email);
    
    // 首先获取 CSRF token
    const csrfResponse = await axios.get(`${BASE_URL}/api/auth/csrf`);
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('CSRF Token:', csrfToken);
    
    const response = await axios.post(`${BASE_URL}/api/auth/callback/credentials`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      redirect: false,
      csrfToken: csrfToken,
      json: true
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // 允许所有成功状态码
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Login successful!');
      
      // 检查响应中是否有 URL 重定向信息
      if (response.data && response.data.url) {
        console.log('Redirect URL:', response.data.url);
      }
    } else if (response.status === 302) {
      console.log('✅ Login successful (redirect)!');
      
      // 检查重定向位置
      const location = response.headers.location;
      console.log('Redirect location:', location);
    }
    
    // 检查会话cookie
    if (response.headers['set-cookie']) {
      const sessionCookies = response.headers['set-cookie'].filter(c => 
        c.includes('next-auth.session-token') || 
        c.includes('sessionid') ||
        c.includes('auth-token')
      );
      
      if (sessionCookies.length > 0) {
        console.log('✅ Session cookies found:');
        sessionCookies.forEach(cookie => console.log('  ', cookie));
      } else {
        console.log('❌ No session cookies found');
        console.log('All cookies:', response.headers['set-cookie']);
      }
    } else {
      console.log('❌ No cookies in response');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Login failed');
      console.log('Status:', error.response.status);
      console.log('Error data:', error.response.data);
      console.log('Error headers:', error.response.headers);
    } else {
      console.log('❌ Request error:', error.message);
    }
  }
}

// 运行测试
testLogin();