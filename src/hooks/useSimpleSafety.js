// src/hooks/useSimpleSafety.js
import { useEffect, useCallback } from 'react';

// 简化的安全钩子，避免复杂的导出问题
export function useConsoleSafety() {
  useEffect(() => {
    console.log('🛡️ 应用基础安全保护');
    
    // 基础的错误过滤
    const originalError = console.error;
    console.error = function(...args) {
      const message = args[0]?.toString() || '';
      
      // 过滤常见的无害错误
      if (message.includes('user') && message.includes('undefined') ||
          message.includes('React does not recognize') ||
          message.includes('hydration')) {
        console.warn('🛡️ 过滤的错误:', message.substring(0, 100));
        return;
      }
      
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);
}

export function useSimpleSafeData() {
  const safeGet = useCallback((obj, path, defaultValue = null) => {
    try {
      if (!obj || typeof obj !== 'object') return defaultValue;
      const keys = path.split('.');
      let result = obj;
      for (const key of keys) {
        if (result == null) return defaultValue;
        result = result[key];
      }
      return result !== undefined ? result : defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);

  const safeCall = useCallback((fn, ...args) => {
    try {
      return typeof fn === 'function' ? fn(...args) : undefined;
    } catch {
      return undefined;
    }
  }, []);

  return { safeGet, safeCall };
}

export function useSimpleSafeUser(user) {
  const { safeGet } = useSimpleSafeData();
  
  return {
    id: safeGet(user, 'id', 'unknown'),
    name: safeGet(user, 'name', '用户'),
    email: safeGet(user, 'email', ''),
    image: safeGet(user, 'image', null),
    role: safeGet(user, 'role', 'USER')
  };
}

// 默认导出组合了安全功能
export default function useSimpleSafety() {
  useConsoleSafety(); // 应用控制台安全保护
  return useSimpleSafeData(); // 返回安全数据工具函数
}
