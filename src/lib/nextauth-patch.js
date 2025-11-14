// lib/nextauth-patch.js
// NextAuth 行为补丁，在组件加载前执行
export function applyNextAuthPatch() {
  if (typeof window === 'undefined') return;
  
  // 在 NextAuth 初始化之前应用补丁
  const originalSetInterval = window.setInterval;
  const patchedIntervals = new Set();
  
  window.setInterval = function(callback, delay, ...args) {
    // 检查是否是 NextAuth 的轮询（通常间隔很短）
    if (delay < 60000 && typeof callback === 'function') {
      const callbackString = callback.toString();
      if (callbackString.includes('auth') || callbackString.includes('session')) {
        console.log('🚫 阻止 NextAuth 轮询定时器');
        const id = originalSetInterval(() => {}, 24 * 60 * 60 * 1000); // 24小时的空定时器
        patchedIntervals.add(id);
        return id;
      }
    }
    return originalSetInterval.call(this, callback, delay, ...args);
  };
  
  // 清理函数
  return () => {
    window.setInterval = originalSetInterval;
    patchedIntervals.forEach(id => clearInterval(id));
  };
}