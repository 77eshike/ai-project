// src/pages/api/speech-diagnose.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== 语音识别诊断 ===');
    
    // 检查环境变量
    console.log('环境变量检查:');
    console.log('- BAIDU_API_KEY:', process.env.BAIDU_API_KEY ? `已设置 (长度: ${process.env.BAIDU_API_KEY.length})` : '未设置');
    console.log('- BAIDU_SECRET_KEY:', process.env.BAIDU_SECRET_KEY ? `已设置 (长度: ${process.env.BAIDU_SECRET_KEY.length})` : '未设置');
    
    // 测试令牌获取
    console.log('测试令牌获取...');
    const tokenResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/baidu-token`, {
      method: 'POST',
    });
    
    const tokenResult = await tokenResponse.json();
    console.log('令牌获取结果:', tokenResult);
    
    if (!tokenResult.access_token) {
      return res.status(500).json({
        success: false,
        error: '令牌获取失败',
        diagnosis: {
          environment: '❌ 环境变量或令牌获取有问题',
          token: '❌ 无法获取访问令牌'
        }
      });
    }
    
    // 测试直接调用百度API
    console.log('测试直接百度API调用...');
    const testResponse = await fetch('https://vop.baidu.com/server_api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: 'wav',
        rate: 16000,
        channel: 1,
        token: tokenResult.access_token,
        cuid: 'diagnose_test',
        len: 100,
        speech: 'test', // 无效的音频数据，用于测试错误响应
        dev_pid: 1537,
      }),
    });
    
    const contentType = testResponse.headers.get('content-type');
    let apiTestResult;
    
    if (contentType && contentType.includes('application/json')) {
      apiTestResult = await testResponse.json();
    } else {
      const text = await testResponse.text();
      apiTestResult = { error: 'non_json_response', preview: text.substring(0, 200) };
    }
    
    console.log('直接API测试结果:', apiTestResult);
    
    res.status(200).json({
      success: true,
      diagnosis: {
        environment: '✅ 环境变量配置正常',
        token: '✅ 令牌获取正常',
        api_connectivity: apiTestResult.err_no ? `⚠️ API连接正常但参数错误 (错误码: ${apiTestResult.err_no})` : '✅ API连接正常',
        details: {
          token_valid: !!tokenResult.access_token,
          api_response_type: contentType,
          api_error_code: apiTestResult.err_no,
          api_error_msg: apiTestResult.err_msg
        }
      }
    });
    
  } catch (error) {
    console.error('诊断失败:', error);
    res.status(500).json({
      success: false,
      error: '诊断失败',
      message: error.message
    });
  }
}