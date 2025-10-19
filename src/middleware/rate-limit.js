// middleware/rate-limit.js - 修复版本
const rateLimitMap = new Map();

export async function rateLimit(request) {
  const { pathname } = request.nextUrl;
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  console.log('🛡️ 速率限制 - 检查请求:', { pathname, ip: ip.substring(0, 10) + '...' });
  
  // 重要：对于API路由，使用更宽松的速率限制或完全跳过
  if (pathname.startsWith('/api/')) {
    return handleApiRateLimit(request, pathname, ip);
  }
  
  // 对于非API路由，使用默认限制
  return handlePageRateLimit(request, pathname, ip);
}

// 处理API路由的速率限制
async function handleApiRateLimit(request, pathname, ip) {
  const now = Date.now();
  const windowMs = 60000; // 1分钟
  
  // 为不同的API端点设置不同的限制
  let maxRequests;
  let key;
  
  if (pathname.includes('/ai/chat')) {
    // AI聊天API - 较宽松的限制
    maxRequests = 30; // 每分钟30次
    key = `api-ai-chat:${ip}`;
    console.log('🤖 AI聊天API速率限制检查');
  } else if (pathname.includes('/auth/')) {
    // 认证API - 更宽松的限制
    maxRequests = 50; // 每分钟50次
    key = `api-auth:${ip}`;
  } else {
    // 其他API - 中等限制
    maxRequests = 100;
    key = `api-other:${ip}`;
  }
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, startTime: now });
    console.log(`🛡️ API速率限制 - 新记录: ${key}, 计数: 1`);
    return { limited: false };
  }
  
  const record = rateLimitMap.get(key);
  
  // 检查时间窗口
  if (now - record.startTime > windowMs) {
    // 重置计数器
    record.count = 1;
    record.startTime = now;
    rateLimitMap.set(key, record);
    console.log(`🛡️ API速率限制 - 重置: ${key}, 计数: 1`);
    return { limited: false };
  }
  
  // 增加计数器
  record.count++;
  rateLimitMap.set(key, record);
  
  console.log(`🛡️ API速率限制 - 更新: ${key}, 计数: ${record.count}/${maxRequests}`);
  
  if (record.count > maxRequests) {
    console.log(`🚫 API速率限制触发: ${pathname}, IP: ${ip}, 计数: ${record.count}`);
    return { limited: true };
  }
  
  return { limited: false };
}

// 处理页面路由的速率限制
async function handlePageRateLimit(request, pathname, ip) {
  const now = Date.now();
  const windowMs = 60000; // 1分钟
  const maxRequests = 100; // 每分钟最多100个请求
  
  const key = `page:${ip}`;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, startTime: now });
    return { limited: false };
  }
  
  const record = rateLimitMap.get(key);
  
  if (now - record.startTime > windowMs) {
    // 重置计数器
    record.count = 1;
    record.startTime = now;
    rateLimitMap.set(key, record);
    return { limited: false };
  }
  
  // 增加计数器
  record.count++;
  rateLimitMap.set(key, record);
  
  if (record.count > maxRequests) {
    console.log(`🚫 页面速率限制触发: ${pathname}, IP: ${ip}, 计数: ${record.count}`);
    return { limited: true };
  }
  
  return { limited: false };
}

// 获取速率限制统计信息
export function getRateLimitStats() {
  const stats = {
    totalEntries: rateLimitMap.size,
    apiEntries: 0,
    pageEntries: 0,
    details: {}
  };
  
  for (const [key, record] of rateLimitMap.entries()) {
    if (key.startsWith('api-')) {
      stats.apiEntries++;
    } else if (key.startsWith('page:')) {
      stats.pageEntries++;
    }
    
    stats.details[key] = {
      count: record.count,
      startTime: new Date(record.startTime).toISOString(),
      age: Date.now() - record.startTime
    };
  }
  
  return stats;
}

// 清除特定IP的速率限制
export function clearIpRateLimit(ip) {
  let clearedCount = 0;
  
  for (const [key] of rateLimitMap.entries()) {
    if (key.includes(ip)) {
      rateLimitMap.delete(key);
      clearedCount++;
    }
  }
  
  console.log(`🧹 清除IP ${ip} 的速率限制记录，共 ${clearedCount} 条`);
  return clearedCount;
}

// 清除所有速率限制记录
export function clearAllRateLimit() {
  const size = rateLimitMap.size;
  rateLimitMap.clear();
  console.log(`🧹 清除所有速率限制记录，共 ${size} 条`);
}

// 定期清理过期的记录
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000;
  let cleanedCount = 0;
  
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.startTime > windowMs * 2) { // 2倍时间窗口后清理
      rateLimitMap.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 自动清理 ${cleanedCount} 个过期速率限制记录`);
  }
}, 30000); // 每30秒清理一次