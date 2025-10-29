// pages/api/speech-proxy.js - 修复版本
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestData = req.body;
    
    console.log('🔄 转发语音识别请求到百度API...', {
      dataLength: requestData.speech?.length || requestData.data?.length,
      format: requestData.format,
      cuid: requestData.cuid
    });

    // 直接转发到百度API
    const baiduResponse = await fetch('https://vop.baidu.com/server_api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!baiduResponse.ok) {
      throw new Error(`百度API错误: ${baiduResponse.status}`);
    }

    const baiduResult = await baiduResponse.json();
    
    console.log('📨 百度API响应:', {
      err_no: baiduResult.err_no,
      err_msg: baiduResult.err_msg,
      resultLength: baiduResult.result?.length
    });

    // 直接返回百度API的原始响应
    return res.status(200).json(baiduResult);

  } catch (error) {
    console.error('❌ 语音识别代理错误:', error);
    return res.status(500).json({
      err_no: 900,
      err_msg: error.message
    });
  }
}