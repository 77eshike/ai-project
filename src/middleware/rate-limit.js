// middleware/rate-limit.js - 优化版本
const rateLimitMap = new Map();
const CLEANUP_INTERVAL = 30 * 1000; // 30秒清理一次
const DEFAULT_WINDOW_MS = 60 * 1000; // 1分钟默认窗口

// API 端点配置
const API_RATE_LIMITS = {
  // AI 相关 API
  '/api/ai/chat': { max: 30, windowMs: 60000, name: 'AI聊天' },
  '/api/ai/generate': { max: 20, windowMs: 60000, name: 'AI生成' },
  '/api/ai/transcribe': { max: 10, windowMs: 60000, name: '语音转文字' },
  
  // 认证相关 API
  '/api/auth/login': { max: 5, windowMs: 300000, name: '用户登录' }, // 5分钟窗口
  '/api/auth/register': { max: 3, windowMs: 900000, name: '用户注册' }, // 15分钟窗口
  '/api/auth/': { max: 50, windowMs: 60000, name: '认证API' },
  
  // 知识库 API
  '/api/knowledge/save': { max: 20, windowMs: 60000, name: '保存知识点' },
  '/api/knowledge/delete': { max: 10, windowMs: 60000, name: '删除知识点' },
  '/api/knowledge/': { max: 100, windowMs: 60000, name: '知识库API' },
  
  // 项目生成 API
  '/api/projects/generate': { max: 5, windowMs: 300000, name: '项目生成' }, // 5分钟窗口
  
  // 其他 API
  '/api/upload': { max: 10, windowMs: 60000, name: '文件上传' },
  '/api/webhook': { max: 100, windowMs: 60000, name: 'Webhook' },
  
  // 默认 API 限制
  'default': { max: 100, windowMs: 60000, name: '默认API' }
};

// 页面路由配置
const PAGE_RATE_LIMITS = {
  '/auth/': { max: 50, windowMs: 60000, name: '认证页面' },
  '/knowledge/': { max: 80, windowMs: 60000, name: '知识库页面' },
  '/projects/': { max: 60, windowMs: 60000, name: '项目页面' },
  'default': { max: 100, windowMs: 60000, name: '默认页面' }
};

export async function rateLimit(request, customOptions = {}) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // 生成唯一键（IP + 路径 + 用户代理哈希）
  const key = generateRateLimitKey(ip, pathname, userAgent);
  
  console.log('🛡️ 速率限制 - 检查请求:', { 
    pathname, 
    ip: maskIP(ip),
    key: key.substring(0, 20) + '...'
  });
  
  // 重要：对于API路由，使用配置的限制
  if (pathname.startsWith('/api/')) {
    return handleApiRateLimit(request, pathname, ip, key, customOptions);
  }
  
  // 对于非API路由，使用页面限制
  return handlePageRateLimit(request, pathname, ip, key, customOptions);
}

// 处理API路由的速率限制
async function handleApiRateLimit(request, pathname, ip, key, customOptions) {
  // 查找匹配的API限制配置
  let limitConfig = API_RATE_LIMITS.default;
  
  for (const [pattern, config] of Object.entries(API_RATE_LIMITS)) {
    if (pattern !== 'default' && pathname.startsWith(pattern)) {
      limitConfig = config;
      break;
    }
  }
  
  // 允许自定义选项覆盖默认配置
  const finalConfig = {
    ...limitConfig,
    ...customOptions
  };
  
  const { max, windowMs, name } = finalConfig;
  
  console.log(`🤖 ${name}API速率限制检查: ${max}次/${windowMs/1000}秒`);
  
  const now = Date.now();
  
  if (!rateLimitMap.has(key)) {
    // 新记录
    rateLimitMap.set(key, {
      count: 1,
      startTime: now,
      windowMs,
      max,
      lastRequest: now,
      pathname,
      ip: maskIP(ip)
    });
    
    console.log(`🛡️ API速率限制 - 新记录: ${name}, 计数: 1`);
    return { 
      limited: false, 
      remaining: max - 1,
      resetTime: now + windowMs
    };
  }
  
  const record = rateLimitMap.get(key);
  
  // 检查时间窗口是否过期
  if (now - record.startTime > windowMs) {
    // 重置计数器
    record.count = 1;
    record.startTime = now;
    record.lastRequest = now;
    record.windowMs = windowMs;
    record.max = max;
    
    rateLimitMap.set(key, record);
    console.log(`🛡️ API速率限制 - 重置: ${name}, 计数: 1`);
    
    return { 
      limited: false, 
      remaining: max - 1,
      resetTime: now + windowMs
    };
  }
  
  // 增加计数器
  record.count++;
  record.lastRequest = now;
  rateLimitMap.set(key, record);
  
  const remaining = Math.max(0, max - record.count);
  const resetTime = record.startTime + windowMs;
  
  console.log(`🛡️ API速率限制 - 更新: ${name}, 计数: ${record.count}/${max}, 剩余: ${remaining}`);
  
  if (record.count > max) {
    console.log(`🚫 API速率限制触发: ${pathname}, IP: ${maskIP(ip)}, 计数: ${record.count}`);
    
    return { 
      limited: true, 
      retryAfter: Math.ceil((resetTime - now) / 1000),
      remaining: 0,
      resetTime
    };
  }
  
  return { 
    limited: false, 
    remaining,
    resetTime
  };
}

// 处理页面路由的速率限制
async function handlePageRateLimit(request, pathname, ip, key, customOptions) {
  // 查找匹配的页面限制配置
  let limitConfig = PAGE_RATE_LIMITS.default;
  
  for (const [pattern, config] of Object.entries(PAGE_RATE_LIMITS)) {
    if (pattern !== 'default' && pathname.startsWith(pattern)) {
      limitConfig = config;
      break;
    }
  }
  
  const finalConfig = {
    ...limitConfig,
    ...customOptions
  };
  
  const { max, windowMs, name } = finalConfig;
  const now = Date.now();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, {
      count: 1,
      startTime: now,
      windowMs,
      max,
      lastRequest: now,
      pathname,
      ip: maskIP(ip)
    });
    
    return { 
      limited: false, 
      remaining: max - 1,
      resetTime: now + windowMs
    };
  }
  
  const record = rateLimitMap.get(key);
  
  if (now - record.startTime > windowMs) {
    // 重置计数器
    record.count = 1;
    record.startTime = now;
    record.lastRequest = now;
    record.windowMs = windowMs;
    record.max = max;
    
    rateLimitMap.set(key, record);
    return { 
      limited: false, 
      remaining: max - 1,
      resetTime: now + windowMs
    };
  }
  
  // 增加计数器
  record.count++;
  record.lastRequest = now;
  rateLimitMap.set(key, record);
  
  const remaining = Math.max(0, max - record.count);
  const resetTime = record.startTime + windowMs;
  
  if (record.count > max) {
    console.log(`🚫 页面速率限制触发: ${pathname}, IP: ${maskIP(ip)}, 计数: ${record.count}`);
    
    return { 
      limited: true, 
      retryAfter: Math.ceil((resetTime - now) / 1000),
      remaining: 0,
      resetTime
    };
  }
  
  return { 
    limited: false, 
    remaining,
    resetTime
  };
}

// 工具函数
function getClientIP(request) {
  return request.ip || 
         request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function maskIP(ip) {
  if (ip === 'unknown' || ip === '::1') return ip;
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip;
}

function generateRateLimitKey(ip, pathname, userAgent) {
  // 使用用户代理的前10个字符的简单哈希
  const uaHash = Buffer.from(userAgent.substring(0, 10)).toString('base64').substring(0, 8);
  return `rate:${ip}:${pathname}:${uaHash}`;
}

// 获取速率限制统计信息
export function getRateLimitStats() {
  const now = Date.now();
  const stats = {
    totalEntries: rateLimitMap.size,
    apiEntries: 0,
    pageEntries: 0,
    limitedEntries: 0,
    byEndpoint: {},
    timestamp: new Date().toISOString()
  };
  
  for (const [key, record] of rateLimitMap.entries()) {
    const isLimited = record.count > record.max;
    const isApi = key.includes('/api/');
    
    if (isApi) {
      stats.apiEntries++;
    } else {
      stats.pageEntries++;
    }
    
    if (isLimited) {
      stats.limitedEntries++;
    }
    
    // 按端点统计
    const endpoint = record.pathname;
    if (!stats.byEndpoint[endpoint]) {
      stats.byEndpoint[endpoint] = {
        total: 0,
        limited: 0,
        maxCount: 0
      };
    }
    
    stats.byEndpoint[endpoint].total++;
    if (isLimited) stats.byEndpoint[endpoint].limited++;
    stats.byEndpoint[endpoint].maxCount = Math.max(
      stats.byEndpoint[endpoint].maxCount, 
      record.count
    );
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
  
  console.log(`🧹 清除IP ${maskIP(ip)} 的速率限制记录，共 ${clearedCount} 条`);
  return clearedCount;
}

// 清除特定路径的速率限制
export function clearPathRateLimit(pathname) {
  let clearedCount = 0;
  
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.pathname === pathname) {
      rateLimitMap.delete(key);
      clearedCount++;
    }
  }
  
  console.log(`🧹 清除路径 ${pathname} 的速率限制记录，共 ${clearedCount} 条`);
  return clearedCount;
}

// 清除所有速率限制记录
export function clearAllRateLimit() {
  const size = rateLimitMap.size;
  rateLimitMap.clear();
  console.log(`🧹 清除所有速率限制记录，共 ${size} 条`);
  return size;
}

// 定期清理过期的记录
function cleanupExpiredRecords() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, record] of rateLimitMap.entries()) {
    // 清理超过2倍时间窗口的记录
    if (now - record.lastRequest > record.windowMs * 2) {
      rateLimitMap.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 自动清理 ${cleanedCount} 个过期速率限制记录`);
  }
  
  return cleanedCount;
}

// 启动定期清理
setInterval(cleanupExpiredRecords, CLEANUP_INTERVAL);

// 导出清理函数供外部调用
export { cleanupExpiredRecords };