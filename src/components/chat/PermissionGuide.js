// src/components/chat/PermissionGuide.js
const PermissionGuide = ({ onRetry, onClose }) => {
  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) {
      return {
        browser: 'Chrome',
        steps: [
          '点击地址栏左侧的锁形图标或信息图标',
          '找到"麦克风"选项',
          '选择"允许"',
          '刷新页面后重试'
        ]
      };
    } else if (userAgent.includes('Firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          '点击地址栏左侧的摄像头图标',
          '在弹出的权限对话框中选择"允许"',
          '如果已经拒绝，点击"x"清除设置',
          '刷新页面后重试'
        ]
      };
    } else if (userAgent.includes('Safari')) {
      return {
        browser: 'Safari',
        steps: [
          '点击Safari菜单 → 偏好设置',
          '进入"网站"标签',
          '在左侧选择"麦克风"',
          '找到当前网站并设置为"允许"'
        ]
      };
    } else if (userAgent.includes('Edge')) {
      return {
        browser: 'Edge',
        steps: [
          '点击地址栏左侧的锁形图标',
          '找到"麦克风"权限',
          '选择"允许"',
          '刷新页面后重试'
        ]
      };
    }
    
    return {
      browser: '您的浏览器',
      steps: [
        '在浏览器设置中找到麦克风权限',
        '允许当前网站使用麦克风',
        '刷新页面后重试语音功能'
      ]
    };
  };

  const instructions = getBrowserInstructions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">麦克风权限设置指南</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {instructions.browser} 麦克风权限设置步骤：
              </span>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              {instructions.steps.map((step, index) => (
                <li key={index} className="pl-2">{step}</li>
              ))}
            </ol>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <div className="flex items-start">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-blue-700">
                设置完成后，请刷新页面或点击下方的"重试"按钮。
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重试语音功能
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionGuide;