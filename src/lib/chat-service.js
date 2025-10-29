// lib/chat-service.js - 简化版本
class ChatService {
  constructor() {
    this.baseURL = '/api';
    this.timeout = 30000;
  }

  /**
   * 统一的请求方法 - 简化错误处理
   */
  async _fetchWithAuth(url, options = {}) {
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
      
      // 简化认证错误处理
      if (response.status === 401) {
        this._notifyAuthError();
        return {
          ok: false,
          sessionExpired: true,
          error: '会话已过期，请重新登录'
        };
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
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
      
      return {
        ok: false,
        error: error.message || '网络错误'
      };
    }
  }

  /**
   * 简单的认证错误通知
   */
  _notifyAuthError() {
    if (typeof window === 'undefined') return;
    
    // 使用简单的事件通知
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      } catch (e) {
        console.log('认证错误通知已发送');
      }
    }, 100);
  }

  /**
   * 发送消息到AI - 简化版本
   */
  async sendMessage(message, conversationId = null) {
    if (!message?.trim()) {
      return {
        success: false,
        error: '消息内容不能为空'
      };
    }

    const response = await this._fetchWithAuth('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: message.trim(),
        conversationId: conversationId,
        mode: 'general'
      })
    });

    // 检查会话过期
    if (response.sessionExpired) {
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

    try {
      const data = await response.json();
      
      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'AI服务返回错误'
        };
      }

      return {
        success: true,
        response: data.response,
        conversationId: data.conversationId
      };
    } catch (error) {
      return {
        success: false,
        error: '解析响应失败'
      };
    }
  }
}

export const chatService = new ChatService();