// components/AIModeSelector.js
import { useState, useEffect } from 'react';

export default function AIModeSelector({ 
  currentMode, 
  onModeChange,
  compact = false 
}) {
  const [modes, setModes] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 可以从API获取，也可以直接使用配置
    const loadModes = async () => {
      try {
        const response = await fetch('/api/ai/modes');
        if (response.ok) {
          const data = await response.json();
          setModes(data.modes);
        } else {
          // 降级方案：使用默认配置
          setModes(getDefaultModes());
        }
      } catch (error) {
        console.error('加载AI模式失败:', error);
        setModes(getDefaultModes());
      }
    };

    loadModes();
  }, []);

  const getDefaultModes = () => ({
    general: { name: '通用助手', icon: '🤖', description: '各种日常问题' },
    technical: { name: '技术专家', icon: '💻', description: '编程和技术' },
    creative: { name: '创意伙伴', icon: '🎨', description: '写作和创意' },
    academic: { name: '学习助手', icon: '📚', description: '学习和教育' },
    casual: { name: '聊天伙伴', icon: '💬', description: '日常聊天' },
    business: { name: '商业顾问', icon: '📊', description: '商业分析' }
  });

  const currentModeInfo = modes[currentMode] || modes.general;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors shadow-sm"
          title="切换AI模式"
        >
          <span className="text-lg">{currentModeInfo.icon}</span>
          <span className="font-medium text-sm">{currentModeInfo.name}</span>
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border z-20">
            {Object.entries(modes).map(([key, mode]) => (
              <button
                key={key}
                onClick={() => {
                  onModeChange(key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                  currentMode === key ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                <span className="text-lg">{mode.icon}</span>
                <div>
                  <div className="font-medium text-sm">{mode.name}</div>
                  <div className="text-xs text-gray-500">{mode.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
        <span className="text-lg mr-2">🎛️</span>
        AI助手模式
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(modes).map(([key, mode]) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-md ${
              currentMode === key 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">{mode.icon}</span>
              <span className="font-medium text-gray-900">{mode.name}</span>
            </div>
            <div className="text-xs text-gray-600 leading-tight">{mode.description}</div>
          </button>
        ))}
      </div>

      {/* 当前模式提示 */}
      <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
        <div className="text-sm text-blue-800">
          <strong>当前模式：</strong>
          <span className="ml-1">{currentModeInfo.name} - {currentModeInfo.description}</span>
        </div>
      </div>
    </div>
  );
}