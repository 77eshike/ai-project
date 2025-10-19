// hooks/useVoiceRecognitionFix.js
import { useCallback, useRef, useState } from 'react';

export const useVoiceRecognitionFix = () => {
  const [voiceState, setVoiceState] = useState({
    isListening: false,
    status: 'idle', // 'idle', 'starting', 'listening', 'stopping', 'error'
    isSupported: false,
    permissionState: 'unknown'
  });
  
  const recognitionRef = useRef(null);
  const stopTimeoutRef = useRef(null);

  // 检查语音识别支持
  const checkSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition;
    
    setVoiceState(prev => ({ 
      ...prev, 
      isSupported,
      permissionState: 'prompt'
    }));
    
    return isSupported;
  }, []);

  // 可靠的停止函数
  const stopRecognition = useCallback(() => {
    // 清理超时
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    if (!recognitionRef.current) {
      setVoiceState(prev => ({ ...prev, isListening: false, status: 'idle' }));
      return true;
    }
    
    try {
      // 更新状态为停止中
      setVoiceState(prev => ({ ...prev, status: 'stopping' }));
      
      // 停止识别
      recognitionRef.current.stop();
      
      // 设置超时保护
      stopTimeoutRef.current = setTimeout(() => {
        console.log('⏰ 停止超时保护触发');
        setVoiceState(prev => ({ ...prev, isListening: false, status: 'idle' }));
        recognitionRef.current = null;
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('停止语音识别失败:', error);
      setVoiceState(prev => ({ ...prev, isListening: false, status: 'error' }));
      recognitionRef.current = null;
      return false;
    }
  }, []);

  // 清理函数
  const cleanup = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        // 忽略错误
      }
      recognitionRef.current = null;
    }
    
    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      status: 'idle'
    }));
  }, []);

  return {
    voiceState,
    setVoiceState,
    recognitionRef,
    stopTimeoutRef,
    checkSupport,
    stopRecognition,
    cleanup
  };
};