// components/VoiceInputPanel.js
import { useState } from 'react';
import VoiceInputButton from './VoiceInputButton';

export default function VoiceInputPanel({ onVoiceResult, onClose }) {
  const [recentTexts, setRecentTexts] = useState([]);

  const handleVoiceResult = (text) => {
    if (text.trim()) {
      // 添加到最近使用
      setRecentTexts(prev => {
        const newTexts = [text, ...prev.filter(t => t !== text)].slice(0, 5);
        return newTexts;
      });
      
      if (onVoiceResult) {
        onVoiceResult(text);
      }
    }
  };

  const handleTextClick = (text) => {
    if (onVoiceResult) {
      onVoiceResult(text);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4 md:items-center md:pb-20">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* 头部 */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">语音输入</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 主要内容 */}
        <div className="p-6">
          {/* 语音按钮 */}
          <div className="flex justify-center mb-6">
            <VoiceInputButton onVoiceResult={handleVoiceResult} />
          </div>

          {/* 使用说明 */}
          <div className="text-center text-gray-600 mb-6">
            <p className="text-sm">点击麦克风按钮开始说话</p>
            <p className="text-xs mt-1">支持普通话识别，请确保网络连接稳定</p>
          </div>

          {/* 最近识别结果 */}
          {recentTexts.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">最近识别</h4>
              <div className="space-y-2">
                {recentTexts.map((text, index) => (
                  <button
                    key={index}
                    onClick={() => handleTextClick(text)}
                    className="w-full text-left p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  >
                    "{text}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <span className="text-blue-500 text-lg mr-2">💡</span>
              <div className="text-xs text-blue-700">
                <strong>使用提示：</strong>在安静环境中说话，语速适中，距离麦克风适当距离可获得最佳识别效果。
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="p-4 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}