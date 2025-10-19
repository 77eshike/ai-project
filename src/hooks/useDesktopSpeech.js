// src/hooks/useDesktopSpeech.js
import { useState, useCallback, useEffect, useRef } from 'react';

export const useDesktopSpeech = (voiceEnabled = true) => {
  const [voiceState, setVoiceState] = useState({
    isListening: false,
    transcript: '',
    finalTranscript: '',
    isSupported: false,
    permissionState: 'prompt',
    status: 'idle',
    supportLevel: 'none',
    waitingForPermission: false
  });
  
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // 检查语音支持
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition;
    
    setVoiceState(prev => ({
      ...prev,
      isSupported,
      supportLevel: isSupported ? 'good' : 'none'
    }));
    
    if (!isSupported) {
      setVoiceError('您的浏览器不支持语音识别功能。请使用最新版Chrome、Edge或Safari。');
      return;
    }
    
    // 初始化语音识别
    try {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🔊 桌面端语音识别开始');
        setVoiceState(prev => ({
          ...prev,
          isListening: true,
          status: 'listening',
          waitingForPermission: false
        }));
        setVoiceError(null);
      };
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = finalTranscriptRef.current;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        finalTranscriptRef.current = finalTranscript;
        
        setVoiceState(prev => ({
          ...prev,
          transcript: interimTranscript,
          finalTranscript: finalTranscript
        }));
      };
      
      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        
        let errorMessage = '语音识别错误';
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            errorMessage = '麦克风权限被拒绝。请允许浏览器访问麦克风。';
            setVoiceState(prev => ({ ...prev, permissionState: 'denied' }));
            break;
          case 'no-speech':
            errorMessage = '未检测到语音输入。请检查麦克风设置。';
            break;
          case 'audio-capture':
            errorMessage = '未找到麦克风设备。';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
        }
        
        setVoiceError(errorMessage);
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          status: 'error'
        }));
      };
      
      recognition.onend = () => {
        console.log('🔊 桌面端语音识别结束');
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          status: 'idle'
        }));
        
        // 如果有最终转录文本，保留它
        if (finalTranscriptRef.current) {
          setTimeout(() => {
            finalTranscriptRef.current = '';
          }, 1000);
        }
      };
      
    } catch (error) {
      console.error('初始化语音识别失败:', error);
      setVoiceError(`初始化语音识别失败: ${error.message}`);
    }
  }, []);

  const startVoiceInput = useCallback(async () => {
    if (!recognitionRef.current) {
      setVoiceError('语音识别未初始化');
      return;
    }
    
    if (voiceState.isListening) {
      console.log('语音识别已在运行中');
      return;
    }
    
    // 重置状态
    finalTranscriptRef.current = '';
    setVoiceState(prev => ({
      ...prev,
      transcript: '',
      finalTranscript: '',
      waitingForPermission: true
    }));
    setVoiceError(null);
    
    try {
      recognitionRef.current.start();
      console.log('🎤 桌面端开始语音输入');
    } catch (error) {
      console.error('启动语音识别失败:', error);
      if (error.name === 'NotAllowedError') {
        setVoiceError('麦克风访问被拒绝。请刷新页面并允许麦克风权限。');
        setVoiceState(prev => ({ ...prev, permissionState: 'denied' }));
      } else {
        setVoiceError(`启动失败: ${error.message}`);
      }
    }
  }, [voiceState.isListening]);

  const stopVoiceInput = useCallback(() => {
    if (!recognitionRef.current || !voiceState.isListening) {
      return;
    }
    
    try {
      recognitionRef.current.stop();
      console.log('🛑 桌面端停止语音输入');
    } catch (error) {
      console.error('停止语音识别失败:', error);
    }
  }, [voiceState.isListening]);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  const speakText = useCallback((text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('语音播报失败:', error);
    }
  }, [voiceEnabled]);

  return {
    voiceState,
    voiceError,
    startVoiceInput,
    stopVoiceInput,
    clearVoiceError,
    speakText
  };
};