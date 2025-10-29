// VoiceInputButton.js
import { useState, useEffect, useRef } from 'react';
import { useMobileSpeech } from '../../../hooks/useMobileSpeech'; // 修改导入

export default function VoiceInputButton({ onVoiceResult, disabled = false }) {
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState(null);
  const pressTimerRef = useRef(null);

  // 使用useMobileSpeech代替useSpeechRecognition
  const { 
    voiceState, 
    voiceError, 
    startVoiceInput, 
    stopVoiceInput, 
    transcript, 
    isPressing 
  } = useMobileSpeech(true);

  // 处理语音结果
  useEffect(() => {
    if (voiceState.finalTranscript && onVoiceResult) {
      onVoiceResult(voiceState.finalTranscript.trim());
    }
  }, [voiceState.finalTranscript, onVoiceResult]);

  // 处理错误
  useEffect(() => {
    if (voiceError) {
      setError(voiceError);
      setTimeout(() => setError(null), 5000);
    }
  }, [voiceError]);

  // 移动端触摸事件处理
  const handleTouchStart = () => {
    if (disabled) return;
    
    pressTimerRef.current = setTimeout(() => {
      if (!voiceState.isListening) {
        startVoiceInput();
      }
    }, 300); // 长按300ms后开始
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    if (voiceState.isListening || isPressing) {
      stopVoiceInput();
    }
  };

  // 桌面端点击事件
  const handleClick = () => {
    if (voiceState.isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  // 音量动画效果
  useEffect(() => {
    let animationId;
    
    if (voiceState.isListening) {
      const animateVolume = () => {
        const baseVolume = 30;
        const variation = Math.sin(Date.now() / 200) * 40;
        setVolume(Math.max(10, baseVolume + variation));
        animationId = requestAnimationFrame(animateVolume);
      };
      animateVolume();
    } else {
      setVolume(0);
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [voiceState.isListening]);

  // 浏览器支持检查
  if (!voiceState.isSupported) {
    return (
      <button disabled className="p-3 text-gray-400 cursor-not-allowed opacity-50">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        disabled={disabled || voiceState.permissionState === 'denied'}
        className={`p-3 rounded-full transition-all duration-200 ${
          voiceState.isListening 
            ? 'bg-red-100 text-red-600 ring-2 ring-red-300' 
            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={voiceState.isListening ? '点击停止录音' : '点击开始说话'}
      >
        {/* 按钮内容保持不变 */}
        {voiceState.isListening ? (
          <div className="relative">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* 其余UI代码保持不变 */}
      {/* ... */}
    </div>
  );
}