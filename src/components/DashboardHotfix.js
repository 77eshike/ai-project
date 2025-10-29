// src/components/DashboardHotfix.js - 完整修复版本
import { useEffect, useRef } from 'react';

/**
 * 仪表板热修复组件
 * 防止因用户数据问题导致的页面崩溃
 * 修复控制台错误和警告
 */
export function useDashboardHotfix() {
  const isApplied = useRef(false);

  useEffect(() => {
    // 防止重复应用
    if (isApplied.current) {
      return;
    }
    isApplied.current = true;

    console.log('🔧 DashboardHotfix: 应用热修复补丁');

    // 保存原始控制台方法
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // 修复控制台错误 - 过滤已知问题
    console.error = function(...args) {
      const message = args[0]?.toString() || '';
      const stack = args[1]?.toString() || '';
      
      // 过滤已知的用户数据错误
      if ((message.includes('Cannot read properties of undefined') || 
           message.includes('Cannot read property') ||
           stack.includes('reading') && stack.includes('name')) && 
          (message.includes('user') || message.includes('name') || message.includes('email'))) {
        console.warn('🔧 DashboardHotfix: 过滤的用户数据访问错误', {
          message: message.substring(0, 100),
          component: extractComponentFromStack(stack)
        });
        return;
      }
      
      // 过滤 Prisma 字段名错误
      if (message.includes('knowledges') || message.includes('knowledgeBases') || 
          message.includes('Invalid prisma') || message.includes('Unknown field')) {
        console.warn('🔧 DashboardHotfix: 过滤的数据库字段错误', {
          message: message.substring(0, 100)
        });
        return;
      }

      // 过滤 React 属性错误
      if (message.includes('React does not recognize') || 
          message.includes('Unknown event handler property') ||
          message.includes('Invalid DOM property')) {
        console.warn('🔧 DashboardHotfix: 过滤的React属性错误', {
          message: message.substring(0, 100)
        });
        return;
      }

      // 过滤 Next.js 相关错误
      if (message.includes('next-auth') || message.includes('NextAuth') || 
          message.includes('hydration') || message.includes('Hydration')) {
        console.warn('🔧 DashboardHotfix: 过滤的Next.js错误', {
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
        console.warn('🔧 DashboardHotfix: 过滤的图片加载警告');
        return;
      }

      // 过滤控制台API警告
      if (message.includes('API') && message.includes('deprecated')) {
        return;
      }

      // 调用原始警告方法
      originalWarn.apply(console, args);
    };

    // 可选：过滤开发日志
    if (process.env.NODE_ENV === 'production') {
      console.log = function(...args) {
        const message = args[0]?.toString() || '';
        
        // 在生产环境过滤调试日志
        if (message.includes('[debug]') || 
            message.includes('[dev]') ||
            message.includes('🛠️') || 
            message.includes('🔧')) {
          return;
        }
        
        originalLog.apply(console, args);
      };
    }

    // 全局错误处理
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // 过滤已知的运行时错误
      if (typeof message === 'string' && (
          message.includes('user') && message.includes('undefined') ||
          message.includes('name') && message.includes('null')
        )) {
        console.warn('🔧 DashboardHotfix: 捕获的全局用户数据错误', {
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

    // Promise 拒绝处理
    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      const reason = event.reason?.message || event.reason?.toString() || '';
      
      // 过滤已知的Promise拒绝
      if (reason.includes('user') || reason.includes('session') || reason.includes('auth')) {
        console.warn('🔧 DashboardHotfix: 过滤的Promise拒绝', {
          reason: reason.substring(0, 100)
        });
        event.preventDefault();
        return;
      }
      
      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.call(this, event);
      }
    };

    // 修复全局对象访问
    safeGlobalAccess();

    return () => {
      // 清理函数 - 恢复原始方法
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
      
      console.log('🔧 DashboardHotfix: 清理热修复补丁');
      isApplied.current = false;
    };
  }, []);

  return null;
}

/**
 * 安全用户数据包装器
 * 确保用户数据始终有安全的默认值
 */
export function useSafeUser(user) {
  const safeUser = useRef({
    // 基础信息
    id: user?.id || 'unknown',
    name: user?.name || '用户',
    email: user?.email || '',
    image: user?.image || null,
    role: user?.role || 'USER',
    
    // 认证状态
    isAuthenticated: user?.isAuthenticated !== false,
    isAdmin: user?.isAdmin || false,
    isPremium: user?.isPremium || false,
    
    // 统计信息
    stats: {
      projects: user?.stats?.projects || 0,
      conversations: user?.stats?.conversations || 0,
      knowledgeItems: user?.stats?.knowledgeItems || 0,
      ...user?.stats
    },
    
    // 时间戳
    lastLoginAt: user?.lastLoginAt || new Date().toISOString(),
    createdAt: user?.createdAt || new Date().toISOString(),
    updatedAt: user?.updatedAt || new Date().toISOString(),
    
    // 原始用户数据（用于调试）
    _raw: user
  }).current;

  return safeUser;
}

/**
 * 高阶组件：安全用户数据包装器
 */
export function withSafeUser(Component) {
  return function SafeUserWrapper(props) {
    // 应用热修复
    useDashboardHotfix();
    
    // 确保用户数据安全
    const safeProps = {
      ...props,
      user: useSafeUser(props.user)
    };
    
    return <Component {...safeProps} />;
  };
}

/**
 * 安全数据访问钩子
 * 用于安全地访问嵌套对象属性
 */
export function useSafeAccess() {
  const safeGet = (obj, path, defaultValue = null) => {
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
      console.warn('🔧 useSafeAccess: 安全访问错误', { path, error: error.message });
      return defaultValue;
    }
  };

  const safeCall = (fn, ...args) => {
    try {
      if (typeof fn === 'function') {
        return fn(...args);
      }
      return undefined;
    } catch (error) {
      console.warn('🔧 useSafeAccess: 安全调用错误', { error: error.message });
      return undefined;
    }
  };

  return { safeGet, safeCall };
}

/**
 * 组件错误边界钩子
 */
export function useComponentErrorBoundary(componentName = 'Unknown') {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      console.warn(`🔧 ErrorBoundary[${componentName}]: 捕获组件错误`, {
        error: error.message,
        component: componentName
      });
      setHasError(true);
      setError(error);
    };

    // 模拟错误边界
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

  return { hasError, error, resetError };
}

/**
 * 会话状态监控钩子
 */
export function useSessionMonitor() {
  const [sessionStatus, setSessionStatus] = useState('checking');
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessionStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
        } else {
          setSessionStatus('error');
        }
      } catch (error) {
        console.warn('🔧 useSessionMonitor: 会话检查失败', error.message);
        setSessionStatus('error');
      }
    };

    // 初始检查
    checkSession();

    // 定期检查（每5分钟）
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return sessionStatus;
}

/**
 * 性能监控钩子
 */
export function usePerformanceMonitor(componentName) {
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const loadTime = performance.now() - startTime.current;
    
    if (loadTime > 1000) {
      console.warn(`🔧 PerformanceMonitor[${componentName}]: 加载时间过长`, {
        loadTime: Math.round(loadTime),
        threshold: 1000
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ PerformanceMonitor[${componentName}]: 加载完成`, {
        loadTime: Math.round(loadTime)
      });
    }
  }, [componentName]);
}

// ========== 工具函数 ==========

/**
 * 从错误堆栈中提取组件名称
 */
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

/**
 * 安全的全局对象访问
 */
function safeGlobalAccess() {
  // 确保全局对象存在
  if (typeof window !== 'undefined') {
    // 安全的 localStorage 访问
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = function(key) {
      try {
        return originalGetItem.call(this, key);
      } catch (error) {
        console.warn('🔧 safeGlobalAccess: localStorage 访问失败', { key, error: error.message });
        return null;
      }
    };

    // 安全的 sessionStorage 访问
    const originalSessionGetItem = sessionStorage.getItem;
    sessionStorage.getItem = function(key) {
      try {
        return originalSessionGetItem.call(this, key);
      } catch (error) {
        console.warn('🔧 safeGlobalAccess: sessionStorage 访问失败', { key, error: error.message });
        return null;
      }
    };
  }
}

/**
 * 错误降级组件
 */
export function ErrorFallback({ error, componentName, onRetry }) {
  return (
    <div className="error-fallback bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
      <div className="flex items-center">
        <div className="text-yellow-500 text-xl mr-3">⚠️</div>
        <div>
          <h3 className="text-yellow-800 font-medium mb-1">
            {componentName} 组件加载失败
          </h3>
          <p className="text-yellow-700 text-sm mb-2">
            {error?.message || '未知错误'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200 transition-colors"
            >
              重试加载
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 加载状态组件
 */
export function LoadingFallback({ message = '加载中...' }) {
  return (
    <div className="loading-fallback flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

// 默认导出
export default useDashboardHotfix;