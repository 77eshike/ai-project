// src/pages/api/auth/_log.js - 完整修复版本
export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);

  // 设置响应头
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔧 允许GET请求用于健康检查
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: '日志服务运行正常',
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许',
      allowed: ['POST', 'GET', 'OPTIONS']
    });
  }

  try {
    // 🔧 宽松的数据处理
    let logData;
    try {
      logData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (error) {
      // 如果JSON解析失败，创建基本日志条目
      logData = {
        message: typeof req.body === 'string' ? req.body : 'Invalid log data',
        level: 'info',
        timestamp: new Date().toISOString(),
        source: 'raw-data'
      };
    }

    // 基本验证和默认值
    if (!logData.message) {
      logData.message = 'No message provided';
    }

    if (!logData.level) {
      logData.level = 'info';
    }

    if (!logData.timestamp) {
      logData.timestamp = new Date().toISOString();
    }

    // 清理敏感信息
    const sanitizedMessage = String(logData.message)
      .replace(/(password|token|secret|authorization)=[^&\s]+/gi, '$1=[REDACTED]')
      .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/g, '[EMAIL_REDACTED]')
      .replace(/(\b[A-Za-z0-9]{20,}\b)/g, '[LONG_TOKEN_REDACTED]');

    // 根据级别记录日志
    const logEntry = `[${logData.level.toUpperCase()}] ${sanitizedMessage}`;
    
    switch (logData.level) {
      case 'error':
        console.error(logEntry);
        break;
      case 'warn':
        console.warn(logEntry);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logEntry);
        }
        break;
      default:
        console.log(logEntry);
    }

    // 🔧 关键修复：始终返回成功
    res.status(200).json({
      success: true,
      message: '日志记录成功',
      timestamp: new Date().toISOString(),
      requestId,
      level: logData.level,
      logged: true
    });

  } catch (error) {
    console.error('日志记录错误:', error);
    
    // 🔧 即使出错也返回成功，避免客户端重试
    res.status(200).json({
      success: true,
      message: '日志已处理',
      timestamp: new Date().toISOString(),
      requestId,
      logged: false
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};