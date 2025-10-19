// pages/api/baidu-token.js
const AK = process.env.BAIDU_API_KEY;
const SK = process.env.BAIDU_SECRET_KEY;

// 缓存token，避免频繁请求
let cachedToken = null;
let tokenExpireTime = 0;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查是否有缓存的未过期token
    if (cachedToken && Date.now() < tokenExpireTime) {
      console.log('✅ 使用缓存的百度token');
      return res.status(200).json({ token: cachedToken });
    }

    if (!AK || !SK) {
      throw new Error('百度API凭证未配置');
    }

    console.log('🔄 获取新的百度token...');

    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${AK}&client_secret=${SK}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`百度token接口错误: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      // 缓存token，提前5分钟过期
      cachedToken = tokenData.access_token;
      tokenExpireTime = Date.now() + (tokenData.expires_in - 300) * 1000;
      
      console.log('✅ 获取百度token成功');
      return res.status(200).json({ token: cachedToken });
    } else {
      throw new Error(`获取token失败: ${tokenData.error_description}`);
    }

  } catch (error) {
    console.error('❌ 获取百度token失败:', error);
    return res.status(500).json({ 
      error: '获取语音服务token失败',
      details: error.message
    });
  }
}