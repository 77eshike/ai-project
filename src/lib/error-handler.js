// lib/error-handler.js - 完整修复版本
class ErrorHandler {
  static handleAuthError(error) {
    console.group('🔐 认证错误处理');
    console.error('原始错误:', error);
    
    const errorMessage = this._extractErrorMessage(error);
    console.log('提取的错误消息:', errorMessage);
    
    // 修复：使用同步方式触发事件，避免异步响应问题
    if (typeof window !== 'undefined') {
      try {
        // 检查是否已经处理过认证错误
        if (window.__AUTH_ERROR_HANDLED__) {
          console.log('🔐 认证错误已处理过，跳过重复处理');
          return errorMessage;
        }
        
        window.__AUTH_ERROR_HANDLED__ = true;
        
        // 使用 setTimeout 0 确保在事件循环的下一个周期触发
        setTimeout(() => {
          try {
            const event = new CustomEvent('auth:session-expired', {
              detail: {
                timestamp: new Date().toISOString(),
                message: errorMessage,
                originalError: error
              }
            });
            
            // 同步分发事件
            window.dispatchEvent(event);
            console.log('🔐 认证错误事件已触发');
          } catch (eventError) {
            console.error('触发认证错误事件失败:', eventError);
          } finally {
            // 3秒后重置处理状态
            setTimeout(() => {
              window.__AUTH_ERROR_HANDLED__ = false;
            }, 3000);
          }
        }, 0);
      } catch (error) {
        console.error('认证错误处理失败:', error);
        window.__AUTH_ERROR_HANDLED__ = false;
      }
    }
    
    console.groupEnd();
    return errorMessage;
  }
  
  static _extractErrorMessage(error) {
    if (!error) return '未知认证错误';
    
    try {
      if (typeof error === 'string') return error;
      if (error instanceof Error) return error.message;
      if (error.error) return String(error.error);
      if (error.message) return String(error.message);
      if (error.status && error.statusText) return `HTTP ${error.status}: ${error.statusText}`;
      return String(error);
    } catch (e) {
      return '认证错误处理失败';
    }
  }
  
  static generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ErrorHandler;