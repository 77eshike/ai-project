// lib/session-cache.js

// 增强的缓存实现
class SessionCache {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 30000; // 30秒
    this.MAX_CACHE_SIZE = 1000; // 防止内存泄漏
    
    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 60000);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    // 更新访问计数
    item.accessCount++;
    return item.data;
  }

  set(key, data) {
    // 防止缓存过大
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION * 2) {
        this.cache.delete(key);
      }
    }
  }

  // 手动清除用户缓存（用于登出、资料更新等场景）
  invalidateUser(userId) {
    const key = `user-${userId}`;
    this.cache.delete(key);
    console.log(`🗑️ 清除用户缓存: ${userId}`);
  }

  getStats() {
    return {
      size: this.cache.size,
      hitRate: this.calculateHitRate(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }

  calculateHitRate() {
    let hits = 0;
    let total = 0;
    
    for (const item of this.cache.values()) {
      total++;
      hits += item.accessCount;
    }
    
    return total > 0 ? (hits / total).toFixed(2) : 0;
  }

  // 清除所有缓存
  clearAll() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }
}

// 创建单例实例
const sessionCache = new SessionCache();

export default sessionCache;