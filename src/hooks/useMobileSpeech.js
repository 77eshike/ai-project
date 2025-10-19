// src/hooks/useMobileSpeech.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getDeviceInfo, 
  checkSpeechSupport, 
  checkMicrophonePermission,
  requestMicrophonePermission 
} from '../components/Utils/deviceUtils';

export const useMobileSpeech = (voiceEnabled = true) => {
  const [voiceState, setVoiceState] = useState({
    isListening: false,
    transcript: '',
    finalTranscript: '',
    isSupported: false,
    permissionState: 'prompt',
    status: 'idle',
    supportLevel: 'none',
    waitingForPermission: false,
    deviceInfo: {}
  });
  
  const [voiceError, setVoiceError] = useState(null);
  const [isPressing, setIsPressing] = useState(false);
  const recognitionRef = useRef(null);
  const isStoppingRef = useRef(false);
  const recognitionTimeoutRef = useRef(null);
  const noSpeechTimeoutRef = useRef(null);
  const hasReceivedResultRef = useRef(false);

  // 先定义 stopVoiceInput，确保它在其他函数之前可用
  const stopVoiceInput = useCallback(() => {
    if (!recognitionRef.current || !voiceState.isListening || isStoppingRef.current) {
      return;
    }

    console.log('🔴 停止语音输入');
    isStoppingRef.current = true;

    // 清除超时
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }

    try {
      recognitionRef.current.stop();
      console.log('✅ 语音识别停止成功');
    } catch (error) {
      console.error('停止语音识别失败:', error);
      // 如果停止失败，强制结束
      isStoppingRef.current = false;
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        status: 'idle'
      }));
    }
  }, [voiceState.isListening]);

  const handleSpeechError = useCallback((error) => {
    isStoppingRef.current = false;
    setIsPressing(false);

    // 清除超时
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }

    let errorMessage = '语音识别错误';
    let permissionState = voiceState.permissionState;

    switch (error) {
      case 'not-allowed':
      case 'permission-denied':
        errorMessage = '麦克风权限被拒绝。请允许浏览器访问麦克风。';
        permissionState = 'denied';
        break;
      case 'no-speech':
        errorMessage = '未检测到语音输入。请靠近麦克风说话或检查麦克风设置。';
        break;
      case 'audio-capture':
        errorMessage = '未找到麦克风设备。请检查设备连接。';
        break;
      case 'network':
        errorMessage = '网络连接问题，请检查网络后重试。';
        break;
      case 'service-not-allowed':
        errorMessage = '语音识别服务不可用。';
        break;
      case 'aborted':
        errorMessage = '语音识别被中止。';
        break;
      case 'language-not-supported':
        errorMessage = '不支持中文语音识别。';
        break;
      default:
        errorMessage = `语音识别错误: ${error}`;
    }

    console.error('❌ 语音识别错误:', error, errorMessage);
    setVoiceError(errorMessage);
    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      status: 'error',
      permissionState
    }));
  }, [voiceState.permissionState]);

  // 使用统一的设备检测
  useEffect(() => {
    const deviceInfo = getDeviceInfo();
    const speechSupport = checkSpeechSupport();
    
    console.log('📱 移动端设备检测:', {
      deviceInfo,
      speechSupport,
      userAgent: navigator.userAgent
    });

    setVoiceState(prev => ({
      ...prev,
      isSupported: speechSupport.supported,
      supportLevel: speechSupport.supportLevel,
      deviceInfo
    }));

    if (!speechSupport.speechRecognitionSupported) {
      setVoiceError('您的浏览器不支持语音识别功能。请使用Chrome、Safari或Edge浏览器。');
      return;
    }

    // 检查麦克风权限状态
    checkMicrophonePermission().then(permissionState => {
      console.log('🎤 初始权限状态:', permissionState);
      setVoiceState(prev => ({ ...prev, permissionState }));
    });

    // 初始化语音识别
    initializeSpeechRecognition();
    
    // 清理函数
    return () => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // 忽略清理错误
        }
      }
    };
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ 浏览器不支持语音识别API');
      setVoiceError('您的浏览器不支持语音识别功能。请使用Chrome、Safari或Edge浏览器。');
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      console.log('🔧 初始化语音识别配置');

      // 关键修复：优化配置
      recognition.continuous = false;  // 改为非连续模式
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;
      
      // 移动端特定设置
      if (voiceState.deviceInfo.isMobile) {
        recognition.continuous = false; // 移动端使用单次识别
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        
        // 尝试不同的语言变体
        const languages = ['zh-CN', 'zh-TW', 'zh-HK', 'cmn-Hans-CN', 'cmn-Hant-TW'];
        for (const lang of languages) {
          try {
            recognition.lang = lang;
            console.log(`✅ 语言设置成功: ${lang}`);
            break;
          } catch (e) {
            console.log(`❌ 语言设置失败: ${lang}`);
          }
        }
      }

      recognition.onstart = () => {
        console.log('🎤 语音识别开始 - 等待语音输入');
        isStoppingRef.current = false;
        setIsPressing(false);
        hasReceivedResultRef.current = false;
        
        setVoiceState(prev => ({
          ...prev,
          isListening: true,
          status: 'listening',
          transcript: '正在聆听...请开始说话',
          finalTranscript: '',
          waitingForPermission: false
        }));
        setVoiceError(null);

        // 设置语音检测超时（8秒）
        noSpeechTimeoutRef.current = setTimeout(() => {
          if (voiceState.isListening && !hasReceivedResultRef.current) {
            console.log('⏰ 语音检测超时 - 未收到任何音频输入');
            setVoiceError('未检测到语音输入。请检查麦克风并确保在安静环境中说话。');
            stopVoiceInput();
          }
        }, 8000);
      };

      recognition.onresult = (event) => {
        if (isStoppingRef.current) return;

        hasReceivedResultRef.current = true;
        
        console.log('🔊 收到语音识别结果', {
          resultsLength: event.results.length,
          resultIndex: event.resultIndex
        });

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          
          console.log(`🗣️ 识别结果 ${i}:`, {
            transcript,
            isFinal: result.isFinal,
            confidence
          });

          if (result.isFinal) {
            finalTranscript += transcript;
            console.log('✅ 最终识别结果:', transcript);
          } else {
            interimTranscript += transcript;
            console.log('⏳ 临时识别结果:', transcript);
          }
        }

        setVoiceState(prev => ({
          ...prev,
          transcript: interimTranscript || '识别中...',
          finalTranscript: prev.finalTranscript + finalTranscript
        }));

        // 清除无语音超时
        if (noSpeechTimeoutRef.current && (interimTranscript || finalTranscript)) {
          clearTimeout(noSpeechTimeoutRef.current);
          noSpeechTimeoutRef.current = null;
        }

        // 如果有最终结果，自动停止
        if (finalTranscript) {
          console.log('🎉 识别完成，自动停止');
          setTimeout(() => {
            if (voiceState.isListening) {
              stopVoiceInput();
            }
          }, 1000);
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ 语音识别错误详情:', {
          error: event.error,
          message: event.message,
          type: event.type
        });
        handleSpeechError(event.error);
      };

      recognition.onend = () => {
        console.log('🔚 语音识别结束');
        isStoppingRef.current = false;
        setIsPressing(false);
        
        // 清除超时
        if (noSpeechTimeoutRef.current) {
          clearTimeout(noSpeechTimeoutRef.current);
          noSpeechTimeoutRef.current = null;
        }
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          status: 'idle',
          transcript: ''
        }));
      };

      recognition.onaudiostart = () => {
        console.log('🔊 音频输入开始 - 麦克风已激活');
      };

      recognition.onaudioend = () => {
        console.log('🔊 音频输入结束');
      };

      recognition.onsoundstart = () => {
        console.log('🎵 检测到声音输入');
        setVoiceState(prev => ({
          ...prev,
          transcript: '检测到声音...正在识别'
        }));
      };

      recognition.onsoundend = () => {
        console.log('🎵 声音输入结束');
      };

      recognition.onnomatch = () => {
        console.log('❓ 没有匹配的识别结果');
        setVoiceState(prev => ({
          ...prev,
          transcript: '未能识别语音，请重试'
        }));
      };

      console.log('✅ 语音识别配置完成');

    } catch (error) {
      console.error('❌ 初始化语音识别失败:', error);
      setVoiceError(`初始化失败: ${error.message}`);
    }
  }, [voiceState.deviceInfo, voiceState.isListening, handleSpeechError, stopVoiceInput]);

  const startVoiceInput = useCallback(async () => {
    if (!recognitionRef.current) {
      console.error('❌ 语音识别未初始化');
      setVoiceError('语音识别未初始化，请刷新页面重试');
      return;
    }

    if (voiceState.isListening) {
      console.log('⚠️ 已在监听中，忽略重复启动');
      return;
    }

    // 清除之前的超时
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
    }

    // 实时检查权限
    const currentPermission = await checkMicrophonePermission();
    console.log('🔍 实时权限检查:', currentPermission);
    
    if (currentPermission !== 'granted') {
      setVoiceError(`麦克风权限: ${currentPermission}。请授权后重试。`);
      setVoiceState(prev => ({ ...prev, permissionState: currentPermission }));
      return;
    }

    console.log('🟢 开始语音输入');
    setIsPressing(true);
    setVoiceState(prev => ({
      ...prev,
      transcript: '启动中...',
      finalTranscript: ''
    }));
    setVoiceError(null);
    isStoppingRef.current = false;
    hasReceivedResultRef.current = false;

    try {
      await recognitionRef.current.start();
      console.log('✅ 语音识别启动成功');
    } catch (error) {
      console.error('❌ 启动语音识别失败:', error);
      setIsPressing(false);
      
      // 如果是 abort 错误，延迟重试
      if (error.toString().includes('abort') || error.toString().includes('started')) {
        console.log('🔄 识别器忙碌，延迟重试');
        recognitionTimeoutRef.current = setTimeout(() => {
          startVoiceInput();
        }, 1000);
      } else {
        handleSpeechError(error.name || 'start-failed');
      }
    }
  }, [voiceState.isListening, handleSpeechError]);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  // 移动端快速测试
  const mobileQuickTest = useCallback(async () => {
    console.log('🧪 移动端快速测试开始');
    setVoiceError(null);

    try {
      // 测试麦克风权限
      const permission = await checkMicrophonePermission();
      console.log('🎤 麦克风权限:', permission);
      
      // 测试语音支持
      const support = checkSpeechSupport();
      console.log('🔊 语音支持:', support);

      setVoiceState(prev => ({ 
        ...prev, 
        permissionState: permission,
        isSupported: support.supported,
        supportLevel: support.supportLevel
      }));

      // 测试语音识别
      if (support.speechRecognitionSupported && permission === 'granted') {
        console.log('🎯 开始语音识别测试');
        await startVoiceInput();
        
        // 5秒后自动停止测试
        setTimeout(() => {
          if (voiceState.isListening) {
            console.log('⏰ 测试时间到，停止识别');
            stopVoiceInput();
          }
        }, 5000);
      } else {
        const errorMsg = !support.speechRecognitionSupported ? 
          '浏览器不支持语音识别' : 
          `麦克风权限: ${permission}`;
        setVoiceError(`测试失败: ${errorMsg}`);
      }

    } catch (error) {
      console.error('🧪 测试出错:', error);
      setVoiceError('测试过程出错: ' + error.message);
    }
  }, [startVoiceInput, stopVoiceInput, voiceState.isListening]);

  const speakText = useCallback((text) => {
    if (!voiceEnabled) return;

    try {
      // 停止之前的播报
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => console.log('🔊 开始语音播报');
      utterance.onend = () => console.log('🔊 语音播报结束');
      utterance.onerror = (e) => console.error('播报错误:', e);

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('语音播报失败:', error);
    }
  }, [voiceEnabled]);

  return {
    voiceState,
    voiceError,
    isPressing,
    startVoiceInput,
    stopVoiceInput,
    clearVoiceError,
    mobileQuickTest,
    speakText
  };
};