// lib/apiErrorHandler.js - 新增文件
export class APIErrorHandler {
  static handleKnowledgeError(error, operation = '操作') {
    console.error(`❌ 知识点${operation}失败:`, error);
    
    let userMessage = `${operation}失败，请重试`;
    
    if (error.message.includes('网络连接错误') || error.message.includes('Failed to fetch')) {
      userMessage = '网络连接失败，请检查网络后重试';
    } else if (error.message.includes('认证') || error.message.includes('登录')) {
      userMessage = '请先登录后再进行操作';
    } else if (error.message.includes('不存在')) {
      userMessage = '知识点不存在或已被删除';
    } else if (error.message.includes('无权')) {
      userMessage = '您没有权限执行此操作';
    } else if (error.message.includes('内容不能为空')) {
      userMessage = '知识点内容不能为空';
    } else if (error.message.includes('临时知识点')) {
      userMessage = '请先保存知识点再进行此操作';
    }
    
    return userMessage;
  }
  
  static handleProjectError(error, operation = '操作') {
    console.error(`❌ 项目${operation}失败:`, error);
    
    let userMessage = `${operation}失败，请重试`;
    
    if (error.message.includes('临时知识点')) {
      userMessage = '请先保存知识点再生成项目';
    } else if (error.message.includes('网络连接错误')) {
      userMessage = '网络连接失败，请检查网络后重试';
    } else if (error.message.includes('认证')) {
      userMessage = '请先登录后再进行操作';
    } else if (error.message.includes('已从该知识点生成过项目')) {
      userMessage = '已从该知识点生成过项目，请选择其他知识点';
    }
    
    return userMessage;
  }

  static handleAPIError(error, context = '') {
    console.error(`❌ API错误 [${context}]:`, error);
    
    // 根据错误类型返回用户友好的消息
    if (error.name === 'AbortError') {
      return '请求超时，请检查网络连接';
    }
    
    if (error.code) {
      switch (error.code) {
        case 'P2002':
          return '数据已存在，请勿重复创建';
        case 'P2025':
          return '相关记录不存在';
        case 'P2014':
          return '数据关系错误';
        case 'P1017':
          return '数据库连接失败，请稍后重试';
        default:
          return `数据库错误: ${error.code}`;
      }
    }
    
    if (error.message) {
      if (error.message.includes('401')) {
        return '认证失败，请重新登录';
      } else if (error.message.includes('403')) {
        return '权限不足，无法执行此操作';
      } else if (error.message.includes('404')) {
        return '请求的资源不存在';
      } else if (error.message.includes('500')) {
        return '服务器内部错误，请稍后重试';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        return '网络连接失败，请检查网络设置';
      }
    }
    
    return error.message || '操作失败，请重试';
  }
}

// 导出默认实例
export default APIErrorHandler;