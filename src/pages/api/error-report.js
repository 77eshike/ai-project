// pages/api/error-report.js - 增强版本
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '方法不允许' });
  }

  const requestId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();

  try {
    const { 
      error, 
      componentStack, 
      timestamp: clientTimestamp, 
      userAgent, 
      url,
      userId,
      sessionInfo,
      environment,
      additionalData
    } = req.body;
    
    // 构建错误对象
    const errorReport = {
      requestId,
      timestamp,
      clientTimestamp: clientTimestamp || timestamp,
      error: {
        message: error?.message || error || '未知错误',
        name: error?.name || 'UnknownError',
        stack: error?.stack,
        componentStack: componentStack || '无组件堆栈'
      },
      context: {
        url: url || req.headers.referer || '未知URL',
        userAgent: userAgent || req.headers['user-agent'] || '未知UA',
        userId: userId || '未登录用户',
        environment: environment || 'production',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      },
      sessionInfo: sessionInfo || {},
      additionalData: additionalData || {}
    };

    // 记录错误到控制台（根据环境调整详细程度）
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 客户端错误报告 [开发模式]:', errorReport);
    } else {
      // 生产环境只记录关键信息
      console.error('🚨 客户端错误报告:', {
        requestId,
        timestamp,
        error: errorReport.error.message,
        url: errorReport.context.url,
        userId: errorReport.context.userId
      });
    }

    // 🔧 这里可以添加其他错误处理逻辑：
    // - 发送到日志服务（如 Sentry、LogRocket）
    // - 保存到数据库
    // - 发送邮件通知（针对严重错误）
    // - 统计错误频率

    // 示例：简单的错误频率统计
    try {
      // 可以在这里实现错误统计逻辑
      const errorKey = `${errorReport.error.name}:${errorReport.error.message}`.substring(0, 100);
      console.log(`📊 错误统计: ${errorKey}`);
    } catch (statsError) {
      // 统计错误不应影响主流程
      console.warn('错误统计失败:', statsError);
    }

    res.status(200).json({ 
      success: true, 
      message: '错误报告已接收',
      requestId,
      reportedAt: timestamp,
      // 在开发环境下返回更多信息用于调试
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          receivedData: req.body,
          processedReport: errorReport
        }
      })
    });

  } catch (error) {
    console.error('❌ 错误报告处理失败:', error);
    
    // 即使处理失败也返回成功，避免客户端循环报告
    res.status(200).json({ 
      success: true, 
      message: '错误报告已接收（处理有警告）',
      requestId,
      reportedAt: timestamp,
      warning: '服务器处理错误报告时遇到问题'
    });
  }
}