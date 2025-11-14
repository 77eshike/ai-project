// components/ErrorBoundary.js - 优化版本
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      showDetails: false,
      isDevelopment: false,
      errorCount: 0,
      lastErrorTime: null
    };
  }

  componentDidMount() {
    // 安全的环境检测
    this.checkEnvironment();
    
    // 监听全局错误（捕获未在错误边界中的错误）
    this.setupGlobalErrorHandling();
  }

  componentWillUnmount() {
    // 清理全局错误监听
    this.cleanupGlobalErrorHandling();
  }

  checkEnvironment = () => {
    if (typeof window !== 'undefined') {
      const isDev = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.includes('.local') ||
                   (process?.env?.NODE_ENV === 'development');
      this.setState({ isDevelopment: isDev });
    }
  }

  setupGlobalErrorHandling = () => {
    if (typeof window === 'undefined') return;
    
    // 保存原始的错误处理函数
    this.originalOnError = window.onerror;
    this.originalOnUnhandledRejection = window.onunhandledrejection;
    
    // 捕获全局 JavaScript 错误
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('🌍 全局错误捕获:', { message, source, lineno, error });
      
      // 防止错误循环
      if (this.state.errorCount > 5) return true;
      
      this.handleGlobalError(error || new Error(message));
      return true; // 阻止默认错误处理
    };
    
    // 捕获未处理的 Promise 拒绝
    window.onunhandledrejection = (event) => {
      console.error('🌍 未处理的 Promise 拒绝:', event.reason);
      this.handleGlobalError(event.reason);
      event.preventDefault(); // 阻止默认错误处理
    };
  }

  cleanupGlobalErrorHandling = () => {
    if (typeof window === 'undefined') return;
    
    // 恢复原始的错误处理函数
    if (this.originalOnError) {
      window.onerror = this.originalOnError;
    }
    if (this.originalOnUnhandledRejection) {
      window.onunhandledrejection = this.originalOnUnhandledRejection;
    }
  }

  handleGlobalError = (error) => {
    const now = Date.now();
    const { lastErrorTime, errorCount } = this.state;
    
    // 防止错误风暴：1分钟内最多记录5个错误
    if (lastErrorTime && (now - lastErrorTime < 60000) && errorCount >= 5) {
      console.warn('⚠️ 错误频率过高，暂停记录');
      return;
    }
    
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1,
      lastErrorTime: now
    }));
    
    this.reportError(error, { type: 'global', timestamp: new Date().toISOString() });
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error,
      timestamp: new Date().toISOString()
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ErrorBoundary 捕获的错误:', error);
    console.error('📋 错误详情:', errorInfo);
    
    this.setState({
      errorInfo,
      timestamp: new Date().toISOString()
    });

    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    const errorData = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      type: errorInfo?.type || 'component',
      timestamp: this.state.timestamp,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      environment: this.state.isDevelopment ? 'development' : 'production'
    };

    // 开发环境：详细日志
    if (this.state.isDevelopment) {
      console.group('🔍 错误诊断信息');
      console.log('错误对象:', error);
      console.log('错误信息:', errorInfo);
      console.log('错误数据:', errorData);
      console.groupEnd();
    }
    
    // 生产环境：发送到错误监控服务
    if (!this.state.isDevelopment) {
      this.sendToErrorService(errorData);
    }
  }

  sendToErrorService = (errorData) => {
    try {
      // 示例：发送到错误监控服务（Sentry、LogRocket等）
      // 在实际项目中，您可以使用专业的错误监控服务
      
      // 简单的 fetch 请求示例
      if (typeof fetch !== 'undefined') {
        fetch('/api/error-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorData),
        }).catch(err => {
          console.warn('错误报告发送失败:', err);
        });
      }
      
      console.log('📊 生产环境错误报告:', {
        message: errorData.message,
        type: errorData.type,
        timestamp: errorData.timestamp
      });
      
    } catch (reportError) {
      console.warn('错误报告处理失败:', reportError);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
      errorCount: 0,
      lastErrorTime: null
    });
    
    // 调用可选的 onRetry 回调
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }

  handleRefresh = () => {
    window.location.reload();
  }

  toggleDetails = () => {
    this.setState(prevState => ({ showDetails: !prevState.showDetails }));
  }

  handleContactSupport = () => {
    // 可以打开支持邮件或跳转到帮助页面
    const subject = encodeURIComponent('应用错误报告');
    const body = encodeURIComponent(
      `错误详情:\n- 时间: ${new Date().toLocaleString()}\n- 页面: ${window.location.href}\n- 错误: ${this.state.error?.message}`
    );
    window.open(`mailto:support@191413.ai?subject=${subject}&body=${body}`, '_blank');
  }

  // 获取友好的错误类型描述
  getErrorTypeDescription = () => {
    const { error } = this.state;
    if (!error) return '未知错误';
    
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return '网络连接问题';
    } else if (errorMessage.includes('timeout')) {
      return '请求超时';
    } else if (errorMessage.includes('auth') || errorMessage.includes('login')) {
      return '认证错误';
    } else if (errorMessage.includes('type')) {
      return '数据类型错误';
    } else if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
      return '数据未定义';
    }
    
    return '应用错误';
  }

  render() {
    if (this.state.hasError) {
      const errorType = this.getErrorTypeDescription();
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            {/* 错误图标 */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
            </div>

            {/* 错误标题 */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              遇到问题
            </h1>
            
            <p className="text-gray-600 text-center mb-2">
              {errorType}导致页面加载失败
            </p>

            <p className="text-sm text-gray-500 text-center mb-8">
              这可能是暂时的网络波动或系统维护，请尝试以下操作
            </p>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-3 mb-8">
              <button 
                onClick={this.handleRetry}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                重新加载组件
              </button>
              
              <button 
                onClick={this.handleRefresh}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <span>🔃</span>
                刷新整个页面
              </button>
            </div>

            {/* 错误详情（可折叠） */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={this.toggleDetails}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                >
                  <span>🔍 错误详情 {this.state.showDetails ? '▲' : '▼'}</span>
                </button>
                
                <span className={`text-xs px-3 py-1 rounded-full ${
                  this.state.isDevelopment 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {this.state.isDevelopment ? '开发环境' : '生产环境'}
                </span>
              </div>
              
              {this.state.showDetails && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">错误信息</h3>
                    <code className="text-sm text-red-600 bg-red-50 p-2 rounded block">
                      {this.state.error?.toString() || '未知错误'}
                    </code>
                  </div>
                  
                  {this.state.errorInfo?.componentStack && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">组件堆栈</h3>
                      <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack.trim()}
                      </pre>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><strong>时间:</strong> {new Date().toLocaleString('zh-CN')}</div>
                    <div><strong>页面:</strong> {typeof window !== 'undefined' ? window.location.href : ''}</div>
                    <div><strong>错误次数:</strong> {this.state.errorCount}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 联系支持 */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-3">
                问题仍未解决？
              </p>
              <button
                onClick={this.handleContactSupport}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                📧 联系技术支持
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 默认属性
ErrorBoundary.defaultProps = {
  fallback: null,
  onError: null,
  onRetry: null
};

export default ErrorBoundary;