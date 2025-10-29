// pages/api/auth/test.js
export default async function handler(req, res) {
  console.log('🔵 测试API被调用，方法:', req.method);
  console.log('请求头:', JSON.stringify(req.headers));
  
  if (req.method === 'POST') {
    try {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        console.log('📋 解析后的请求体:', JSON.stringify(body));
      } catch (parseError) {
        console.log('❌ JSON解析错误:', parseError.message);
        return res.status(400).json({ 
          message: '无效的JSON格式',
          error: parseError.message 
        });
      }
      
      return res.status(200).json({ 
        message: '测试成功', 
        body: body,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('测试API错误:', error);
      return res.status(500).json({ 
        message: '服务器错误',
        error: error.message 
      });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}