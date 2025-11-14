// lib/api-response.js - 新增文件
export function createApiResponse(success, data = null, error = null, meta = {}) {
  return {
    success,
    data,
    error,
    ...meta,
    timestamp: new Date().toISOString()
  };
}

export function handleApiError(error, context = 'API') {
  console.error(`❌ ${context} 错误:`, error);
  
  if (error.name === 'AbortError') {
    return createApiResponse(false, null, '请求超时');
  }
  
  if (error.message.includes('network') || error.message.includes('Network')) {
    return createApiResponse(false, null, '网络连接失败');
  }
  
  if (error.message.includes('auth') || error.message.includes('unauthorized')) {
    return createApiResponse(false, null, '认证失败，请重新登录');
  }
  
  if (error.message.includes('database') || error.message.includes('prisma')) {
    return createApiResponse(false, null, '数据库暂时不可用');
  }
  
  return createApiResponse(false, null, error.message || '服务器错误');
}

export function validateRequestBody(requiredFields = []) {
  return (body) => {
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`缺少必要字段: ${missingFields.join(', ')}`);
    }
    
    return true;
  };
}