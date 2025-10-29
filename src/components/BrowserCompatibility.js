// components/BrowserCompatibility.js
import { useState, useEffect } from 'react';

export default function BrowserCompatibility() {
  const [isSupported, setIsSupported] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkCompatibility = () => {
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      
      if (!hasSpeechRecognition) {
        setIsSupported(false);
        setShowWarning(true);
      } else if (!isChrome) {
        // 非Chrome浏览器可能支持但不稳定
        setShowWarning(true);
      }
    };

    checkCompatibility();
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 max-w-sm shadow-lg z-40">
      <div className="flex items-start">
        <span className="text-yellow-500 text-lg mr-2">⚠️</span>
        <div>
          <div className="font-medium text-yellow-800">浏览器兼容性提示</div>
          <div className="text-sm text-yellow-700 mt-1">
            {!isSupported ? (
              <p>您的浏览器不支持语音识别功能，建议使用最新版Chrome浏览器获得最佳体验。</p>
            ) : (
              <p>语音识别功能在Chrome浏览器中表现最佳，其他浏览器可能存在兼容性问题。</p>
            )}
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-yellow-600 hover:text-yellow-800 text-sm mt-2"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}