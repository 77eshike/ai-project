// src/components/DashboardErrorBoundary.js - 增强版本
import { Component } from 'react';

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error Boundary Caught:', error);
    console.error('Error Info:', errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">页面加载出错</h2>
            <p className="text-gray-600 mb-4">
              抱歉，加载仪表板时出现了问题。这可能是由于数据格式错误或网络问题。
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={() => window.location.href = '/auth/signin'}
                className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition-colors"
              >
                返回登录页
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer">开发调试信息</summary>
                <pre className="whitespace-pre-wrap mt-2">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;