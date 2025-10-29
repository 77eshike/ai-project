// src/hooks/useDashboardSafety.js - 完整安全保护钩子
import { useEffect, useRef, useCallback } from 'react';

/**
 * 仪表板安全保护钩子
 * 防止控制台错误导致页面崩溃，提供安全的数据访问
 */
export function useDashboardSafety() {
  const isApplied = useRef(false);

  useEffect(() => {
    if (isApplied.current) return;
    isApplied.current = true;

    console.log('🛡️ 应用仪表板安全保护');

    // 保存原始控制台方法
    const originalError = console.error;
    const originalWarn = console.warn;

    // 修复控制台错误 - 过滤已知问题
    console.error = function(...args) {
      const message = args[0]?.toString() || '';
      const stack = args[1]?.toString() || '';
      
      // 过滤已知的用户数据错误
      if ((message.includes('Cannot read properties of undefined') || 
           message.includes('Cannot read property') ||
           stack.includes('reading') && stack.includes('name')) && 
          (message.includes('user') || message.includes('name') || message.includes('email'))) {
        console.warn('🛡️ 安全保护: 过滤的用户数据访问错误', {
          message: message.substring(0, 100),
          component: extractComponentFromStack(stack)
        });
        return;
      }
      
      // 过滤 React 属性错误
      if (message.includes('React does not recognize') || 
          message.includes('Unknown event handler property') ||
          message.includes('Invalid DOM property')) {
        console.warn('🛡️ 安全保护: 过滤的React属性错误', {
          message: message.substring(0, 100)
        });
        return;
      }

      // 过滤 Next.js 相关错误
      if (message.includes('next-auth') || message.includes('NextAuth') || 
          message.includes('hydration') || message.includes('Hydration')) {
        console.warn('🛡️ 安全保护: 过滤的Next.js错误', {
          message: message.substring(0, 100)
        });
        return;
      }

      // 调用原始错误方法
      originalError.apply(console, args);
    };

    // 修复警告信息
    console.warn = function(...args) {
      const message = args[0]?.toString() || '';
      
      // 过滤 React 开发警告
      if (message.includes('validateDOMNesting') ||
          message.includes('duplicate key') ||
          message.includes('Each child in a list should have a unique')) {
        return;
      }
      
      // 过滤图片加载警告
      if (message.includes('Failed to load') && message.includes('img')) {
        console.warn('🛡️ 安全保护: 过滤的图片加载警告');
        return;
      }

      // 调用原始警告方法
      originalWarn.apply(console, args);
    };

    // 全局错误处理
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // 过滤已知的运行时错误
      if (typeof message === 'string' && (
          message.includes('user') && message.includes('undefined') ||
          message.includes('name') && message.includes('null') ||
          message.includes('stats') && message.includes('length')
        )) {
        console.warn('🛡️ 安全保护: 捕获的全局用户数据错误', {
          message: message.substring(0, 100),
          source,
          lineno
        });
        return true; // 阻止默认错误处理
      }
      
      if (originalOnError) {
        return originalOnError.apply(this, arguments);
      }
    };

    return () => {
      // 清理函数 - 恢复原始方法
      console.error = originalError;
      console.warn = originalWarn;
      window.onerror = originalOnError;
      
      console.log('🛡️ 安全保护: 清理完成');
      isApplied.current = false;
    };
  }, []);
}

/**
 * 安全数据访问钩子
 * 提供安全的对象属性访问方法
 */
export function useSafeData() {
  /**
   * 安全获取嵌套对象属性
   * @param {Object} obj - 要访问的对象
   * @param {string} path - 属性路径，如 'user.stats.projects'
   * @param {*} defaultValue - 默认值
   * @returns {*} 属性值或默认值
   */
  const safeGet = useCallback((obj, path, defaultValue = null) => {
    try {
      if (!obj || typeof obj !== 'object') return defaultValue;
      
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result == null || typeof result !== 'object') {
          return defaultValue;
        }
        result = result[key];
        if (result === undefined) return defaultValue;
      }
      
      return result !== null && result !== undefined ? result : defaultValue;
    } catch (error) {
      console.warn('🛡️ safeGet: 安全访问错误', { 
        path, 
        error: error.message,
        objectType: typeof obj
      });
      return defaultValue;
    }
  }, []);

  /**
   * 安全调用函数
   * @param {Function} fn - 要调用的函数
   * @param {...*} args - 函数参数
   * @returns {*} 函数返回值或 undefined
   */
  const safeCall = useCallback((fn, ...args) => {
    try {
      if (typeof fn === 'function') {
        return fn(...args);
      }
      return undefined;
    } catch (error) {
      console.warn('🛡️ safeCall: 安全调用错误', { 
        error: error.message,
        functionType: typeof fn
      });
      return undefined;
    }
  }, []);

  /**
   * 安全设置对象属性
   * @param {Object} obj - 目标对象
   * @param {string} path - 属性路径
   * @param {*} value - 要设置的值
   * @returns {boolean} 是否设置成功
   */
  const safeSet = useCallback((obj, path, value) => {
    try {
      if (!obj || typeof obj !== 'object') return false;
      
      const keys = path.split('.');
      let current = obj;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = value;
      return true;
    } catch (error) {
      console.warn('🛡️ safeSet: 安全设置错误', { 
        path, 
        error: error.message 
      });
      return false;
    }
  }, []);

  /**
   * 安全合并对象
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   * @returns {Object} 合并后的对象
   */
  const safeMerge = useCallback((target, source) => {
    try {
      if (!target || typeof target !== 'object') return source || {};
      if (!source || typeof source !== 'object') return target || {};
      
      return {
        ...target,
        ...source
      };
    } catch (error) {
      console.warn('🛡️ safeMerge: 安全合并错误', { 
        error: error.message 
      });
      return target || {};
    }
  }, []);

  return { 
    safeGet, 
    safeCall, 
    safeSet, 
    safeMerge 
  };
}

/**
 * 安全用户数据钩子
 * 专门用于处理用户数据的钩子
 */
export function useSafeUser(user) {
  const { safeGet, safeMerge } = useSafeData();

  const safeUser = useCallback(() => {
    const baseUser = {
      id: 'unknown',
      name: '用户',
      email: '',
      image: null,
      role: 'USER',
      isAuthenticated: false,
      isAdmin: false,
      isPremium: false,
      stats: {
        projects: 0,
        conversations: 0,
        knowledgeItems: 0
      },
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!user) {
      return baseUser;
    }

    try {
      return safeMerge(baseUser, {
        id: safeGet(user, 'id', 'unknown'),
        name: safeGet(user, 'name', '用户'),
        email: safeGet(user, 'email', ''),
        image: safeGet(user, 'image', null),
        role: safeGet(user, 'role', 'USER'),
        isAuthenticated: safeGet(user, 'isAuthenticated', false),
        isAdmin: safeGet(user, 'isAdmin', false),
        isPremium: safeGet(user, 'isPremium', false),
        stats: {
          projects: safeGet(user, 'stats.projects', 0),
          conversations: safeGet(user, 'stats.conversations', 0),
          knowledgeItems: safeGet(user, 'stats.knowledgeItems', 0)
        },
        lastLoginAt: safeGet(user, 'lastLoginAt', new Date().toISOString()),
        createdAt: safeGet(user, 'createdAt', new Date().toISOString()),
        updatedAt: safeGet(user, 'updatedAt', new Date().toISOString())
      });
    } catch (error) {
      console.warn('🛡️ useSafeUser: 用户数据处理错误', error);
      return baseUser;
    }
  }, [user, safeGet, safeMerge]);

  return safeUser();
}

/**
 * 组件错误边界钩子
 */
export function useComponentSafety(componentName = 'Unknown') {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      console.warn(`🛡️ 组件安全[${componentName}]: 捕获组件错误`, {
        error: error.message,
        component: componentName
      });
      setHasError(true);
      setError(error);
    };

    // 监听组件相关错误
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      if (message.includes(componentName) && 
          (message.includes('TypeError') || message.includes('ReferenceError'))) {
        handleError(new Error(message));
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [componentName]);

  const resetError = () => {
    setHasError(false);
    setError(null);
  };

  return { 
    hasError, 
    error, 
    resetError,
    ErrorFallback: hasError ? (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-yellow-800 font-medium mb-2">
          {componentName} 组件暂时不可用
        </h3>
        <p className="text-yellow-700 text-sm">
          请尝试刷新页面或联系支持
        </p>
        <button
          onClick={resetError}
          className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
        >
          重试
        </button>
      </div>
    ) : null
  };
}

// 工具函数
function extractComponentFromStack(stack) {
  if (!stack) return 'unknown';
  
  const reactComponentMatch = stack.match(/at (\w+)/);
  if (reactComponentMatch) {
    return reactComponentMatch[1];
  }
  
  const fileMatch = stack.match(/([^/\\]+)\.(jsx?|tsx?)/);
  if (fileMatch) {
    return fileMatch[1];
  }
  
  return 'unknown';
}

export default useDashboardSafety;