// src/components/chat/VoiceUnsupported.js - 优化版本
import { useState } from 'react';

const VoiceUnsupported = ({ onRetry }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleRetry = () => {
    setIsVisible(false);
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            您的浏览器不支持语音识别功能。请使用最新版本的Chrome、Edge或Safari浏览器。
          </p>
          <div className="mt-2">
            <div className="text-xs text-yellow-600">
              <strong>推荐方案:</strong>
            </div>
            <ul className="text-xs text-yellow-600 mt-1 space-y-1">
              <li>• 移动端: 使用Chrome或Safari浏览器</li>
              <li>• 桌面端: 使用Chrome、Edge或Safari浏览器</li>
              <li>• 确保已授予麦克风权限</li>
            </ul>
          </div>
        </div>
        <div className="ml-3 flex space-x-2">
          {onRetry && (
            <button
              onClick={handleRetry}
              className="text-yellow-700 hover:text-yellow-600 text-sm font-medium"
            >
              重试检测
            </button>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="text-yellow-700 hover:text-yellow-600"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceUnsupported;