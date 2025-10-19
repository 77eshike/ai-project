// src/hooks/useSpeechRecognition.js - 修复版本
import { useState, useEffect, useCallback, useRef } from 'react';

const useSpeechRecognition = (options = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  
  const recognitionRef = useRef(null);
  const isSupportedRef = useRef(false);

  // 检查麦克风权限
  const checkMicrophonePermission = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return 'unsupported';
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // 立即停止流，只检查权限
      stream.getTracks().forEach(track => track.stop());
      return 'granted';
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'prompt';
    }
  }, []);

  // 请求麦克风权限
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // 立即停止流，只请求权限
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      return true;
    } catch (error) {
      setPermissionState('denied');
      setError(new Error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问'));
      return false;
    }
  }, []);

  // 检查浏览器支持
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    isSupportedRef.current = !!SpeechRecognition;
    
    if (isSupportedRef.current) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🎤 Web Speech API 开始监听');
        setIsListening(true);
        setError(null);
        setPermissionState('granted');
      };
      
      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        
        setTranscript(interim || final);
        if (final) {
          setFinalTranscript(final);
          if (options.onResult) {
            options.onResult(final);
          }
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Web Speech API 错误:', event.error);
        
        let errorMessage = '语音识别错误';
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
            setPermissionState('denied');
            break;
          case 'no-speech':
            errorMessage = '未检测到语音输入';
            break;
          case 'audio-capture':
            errorMessage = '未找到麦克风设备';
            break;
          case 'network':
            errorMessage = '网络连接问题';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
        }
        
        const error = new Error(errorMessage);
        setError(error);
        setIsListening(false);
        if (options.onError) {
          options.onError(error);
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Web Speech API 结束监听');
        setIsListening(false);
      };
    } else {
      setError(new Error('浏览器不支持 Web Speech API'));
    }
  }, [options]);

  // 初始权限检查
  useEffect(() => {
    const initPermission = async () => {
      const permission = await checkMicrophonePermission();
      setPermissionState(permission);
    };
    
    initPermission();
  }, [checkMicrophonePermission]);

  const startListening = useCallback(async () => {
    if (!isSupportedRef.current) {
      const error = new Error('浏览器不支持 Web Speech API');
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      return false;
    }
    
    if (isListening) {
      console.log('⚠️ 已经在监听中');
      return false;
    }
    
    // 检查权限
    if (permissionState === 'denied') {
      const error = new Error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      return false;
    }
    
    // 如果权限未确定，先请求权限
    if (permissionState === 'prompt') {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        return false;
      }
    }
    
    try {
      recognitionRef.current.start();
      return true;
    } catch (error) {
      console.error('启动 Web Speech API 失败:', error);
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      return false;
    }
  }, [isListening, permissionState, options, requestMicrophonePermission]);

  const stopListening = useCallback(() => {
    if (!isSupportedRef.current || !isListening) {
      return false;
    }
    
    try {
      recognitionRef.current.stop();
      return true;
    } catch (error) {
      console.error('停止 Web Speech API 失败:', error);
      setError(error);
      return false;
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  const requestPermission = useCallback(async () => {
    return await requestMicrophonePermission();
  }, [requestMicrophonePermission]);

  return {
    isListening,
    transcript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    requestPermission,
    isSupported: isSupportedRef.current,
    permissionState
  };
};

export default useSpeechRecognition;