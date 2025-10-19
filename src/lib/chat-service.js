// lib/chat-service.js - 修复认证错误处理
class ChatService {
  constructor() {
    this.baseURL = '/api';
    this.timeout = 30000;
    this.isProcessingAuthError = false; // 防止重复处理认证错误
  }

  /**
   * 统一的请求方法 - 修复认证错误处理
   */
  async _fetchWithAuth(url, options = {}) {
    // 如果正在处理认证错误，避免重复请求
    if (this.isProcessingAuthError) {
      return {
        ok: false,
        sessionExpired: true,
        error: '正在处理认证错误，请稍后重试'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const fullUrl = `${this.baseURL}${url}`;
      console.log('🔗 API请求:', fullUrl);
      
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        }
      });
      
      clearTimeout(timeoutId);
      
      // 处理401认证错误 - 修复重复处理问题
      if (response.status === 401) {
        console.log('🔐 检测到401错误，触发认证错误处理');
        
        // 防止重复处理
        if (!this.isProcessingAuthError) {
          this.isProcessingAuthError = true;
          
          // 使用同步方式处理认证错误
          this._handleAuthErrorSync({
            status: 401,
            statusText: 'Unauthorized',
            error: '会话已过期，请重新登录'
          });
          
          // 3秒后重置处理状态
          setTimeout(() => {
            this.isProcessingAuthError = false;
          }, 3000);
        }
        
        return {
          ok: false,
          sessionExpired: true,
          error: '会话已过期，请重新登录',
          status: 401
        };
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          if (errorText) errorMessage = errorText;
        }
        
        return {
          ok: false,
          error: errorMessage,
          status: response.status
        };
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return {
          ok: false,
          error: '请求超时，请稍后重试',
          timeout: true
        };
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          ok: false,
          error: '网络连接失败，请检查网络设置',
          networkError: true
        };
      }
      
      return {
        ok: false,
        error: error.message || '未知错误'
      };
    }
  }

  /**
   * 同步处理认证错误，避免异步事件问题
   */
  _handleAuthErrorSync(error) {
    if (typeof window === 'undefined') return;
    
    try {
      // 直接设置全局变量，避免事件监听器的异步问题
      if (window.__AUTH_ERROR_HANDLED__) {
        console.log('🔐 认证错误已处理过，跳过重复处理');
        return; // 避免重复处理
      }
      
      window.__AUTH_ERROR_HANDLED__ = true;
      
      // 使用微任务延迟事件触发
      Promise.resolve().then(() => {
        try {
          const event = new CustomEvent('auth:session-expired', {
            detail: {
              timestamp: new Date().toISOString(),
              message: error.error,
              originalError: error
            }
          });
          window.dispatchEvent(event);
          console.log('🔐 同步认证错误事件已触发');
        } catch (eventError) {
          console.error('分发认证事件失败:', eventError);
        } finally {
          // 1秒后重置处理状态
          setTimeout(() => {
            window.__AUTH_ERROR_HANDLED__ = false;
          }, 1000);
        }
      });
      
    } catch (error) {
      console.error('同步处理认证错误失败:', error);
      window.__AUTH_ERROR_HANDLED__ = false;
    }
  }

  /**
   * 发送消息到AI - 修复会话管理
   */
  async sendMessage(message, conversationId = null) {
    // 基本验证
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: '消息内容不能为空'
      };
    }

    try {
      const response = await this._fetchWithAuth('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: message.trim(),
          conversationId: conversationId,
          mode: 'general'
        })
      });

      // 检查会话过期
      if (response.sessionExpired || response.status === 401) {
        console.log('🔐 检测到会话过期');
        return {
          success: false,
          sessionExpired: true,
          error: '会话已过期，请重新登录'
        };
      }

      // 检查其他错误
      if (!response.ok) {
        return {
          success: false,
          error: response.error
        };
      }

      // 解析成功响应
      const data = await response.json();
      
      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'AI服务返回错误'
        };
      }

      if (!data.response) {
        return {
          success: false,
          error: 'AI服务返回了空的响应'
        };
      }

      console.log('✅ 消息发送成功');
      return {
        success: true,
        response: data.response,
        conversationId: data.conversationId
      };
    } catch (error) {
      console.error('发送消息异常:', error);
      return {
        success: false,
        error: '发送消息时发生异常'
      };
    }
  }

  /**
   * 检查会话状态
   */
  async checkSession() {
    try {
      const response = await this._fetchWithAuth('/auth/session-check');
      
      if (response.sessionExpired || response.status === 401) {
        return {
          valid: false,
          sessionExpired: true
        };
      }
      
      if (!response.ok) {
        return {
          valid: false,
          error: response.error
        };
      }
      
      const data = await response.json();
      return {
        valid: data.valid || false,
        user: data.user
      };
    } catch (error) {
      console.error('检查会话状态异常:', error);
      return {
        valid: false,
        error: '检查会话状态失败'
      };
    }
  }
}

export const chatService = new ChatService();
export default ChatService;