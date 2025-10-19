// components/VoiceRecognition.js（结果修复版）
import { useState, useRef, useCallback, useEffect } from 'react';

const VoiceRecognition = ({ onTranscript, onError, autoStop = true }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const stopTimeoutRef = useRef(null);
  
  // 用于累积识别结果
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  // 检查权限状态
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'microphone' }).then(permissionStatus => {
        setPermissionStatus(permissionStatus.state);
        permissionStatus.onchange = () => {
          setPermissionStatus(permissionStatus.state);
        };
      });
    }
  }, []);

  // 可靠的停止函数
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    // 清理超时
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    try {
      setIsListening(false);
      recognitionRef.current.stop();
      
      // 设置超时保护
      stopTimeoutRef.current = setTimeout(() => {
        console.log('语音识别停止超时保护');
        recognitionRef.current = null;
      }, 2000);
      
    } catch (error) {
      console.error('停止语音识别错误:', error);
      recognitionRef.current = null;
    }
    
    // 确保最终结果被传递
    if (finalTranscriptRef.current && onTranscript) {
      onTranscript(finalTranscriptRef.current.trim());
    }
  }, [isListening, onTranscript]);

  // 初始化语音识别
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      if (onError) onError('Speech recognition not supported in this browser');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;

    // 修复结果处理逻辑
    recognition.onresult = (event) => {
      let newFinalTranscript = finalTranscriptRef.current;
      let newInterimTranscript = '';
      
      // 确保有结果才处理
      if (event.results.length === 0) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript.trim();
        
        if (result.isFinal && transcriptText) {
          newFinalTranscript += (newFinalTranscript ? ' ' : '') + transcriptText;
        } else if (transcriptText) {
          newInterimTranscript += (newInterimTranscript ? ' ' : '') + transcriptText;
        }
      }

      // 更新引用
      if (newFinalTranscript !== finalTranscriptRef.current) {
        finalTranscriptRef.current = newFinalTranscript;
      }
      interimTranscriptRef.current = newInterimTranscript;

      // 更新显示
      if (finalTranscriptRef.current) {
        setTranscript(finalTranscriptRef.current);
      } else if (interimTranscriptRef.current) {
        setTranscript(interimTranscriptRef.current + ' 【识别中...】');
      }
    };

    recognition.onstart = () => {
      console.log('语音识别开始');
      setIsListening(true);
      // 重置状态
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setTranscript('');
    };

    recognition.onend = () => {
      console.log('语音识别结束');
      setIsListening(false);
      clearTimeout(timeoutRef.current);
      
      // 确保最终结果被设置
      if (finalTranscriptRef.current) {
        setTranscript(finalTranscriptRef.current);
        if (onTranscript) {
          onTranscript(finalTranscriptRef.current.trim());
        }
      } else if (interimTranscriptRef.current) {
        setTranscript(interimTranscriptRef.current);
      }
      
      // 清理停止超时
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      clearTimeout(timeoutRef.current);
      
      // 清理停止超时
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      
      let errorMessage = `语音识别错误: ${event.error}`;
      
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = '麦克风权限被拒绝。请检查浏览器设置并允许麦克风访问。';
          setPermissionStatus('denied');
          break;
        case 'no-speech':
          errorMessage = '未检测到语音输入。请确保麦克风正常工作。';
          break;
        case 'audio-capture':
          errorMessage = '未找到麦克风设备。请检查麦克风连接。';
          break;
        case 'network':
          errorMessage = '网络错误，语音识别服务不可用。';
          break;
        default:
          errorMessage = `语音识别错误: ${event.error}`;
      }
      
      if (onError) onError(errorMessage);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearTimeout(timeoutRef.current);
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
    };
  }, [onTranscript, onError, autoStop, stopListening]);

  // 增强的开始监听函数
  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      if (onError) onError('语音识别未初始化');
      return;
    }

    if (isListening) {
      console.log('语音识别已在运行中');
      return;
    }

    if (permissionStatus === 'denied') {
      if (onError) onError('麦克风权限已被拒绝，请在浏览器设置中修改权限');
      return;
    }

    try {
      // 重置状态
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setTranscript('');
      
      recognitionRef.current.start();
      console.log('尝试启动语音识别...');

      timeoutRef.current = setTimeout(() => {
        if (!isListening) {
          console.log('语音识别启动超时');
          if (onError) onError('语音识别启动超时，请检查麦克风权限');
        }
      }, 3000);

    } catch (error) {
      console.error('启动语音识别失败:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        if (onError) onError('麦克风访问被拒绝。请允许浏览器使用麦克风。');
        setPermissionStatus('denied');
      } else if (error.name === 'InvalidStateError') {
        console.log('语音识别已在运行');
        setIsListening(true);
      } else {
        if (onError) onError(`启动失败: ${error.message}`);
      }
    }
  }, [isListening, onError, permissionStatus]);

  // 切换监听状态
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // 清除转录文本
  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
  }, []);

  if (!isSupported) {
    return (
      <div className="voice-recognition unsupported">
        <p>您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器。</p>
      </div>
    );
  }

  return (
    <div className="voice-recognition">
      {permissionStatus === 'denied' && (
        <div className="permission-warning">
          <p>❌ 麦克风权限被拒绝</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            刷新页面并重试
          </button>
        </div>
      )}
      
      <div className="voice-controls">
        <button 
          className={`voice-button ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          disabled={permissionStatus === 'denied'}
          aria-label={isListening ? '停止录音' : '开始录音'}
        >
          <span className="voice-icon">
            {isListening ? '🛑' : '🎤'}
          </span>
          {isListening ? '停止录音' : '开始录音'}
        </button>
        
        {transcript && (
          <button 
            className="clear-button"
            onClick={clearTranscript}
            aria-label="清除文本"
          >
            清除
          </button>
        )}
      </div>
      
      {isListening && (
        <div className="listening-indicator">
          <div className="pulse"></div>
          <span>正在聆听中...</span>
        </div>
      )}
      
      {transcript && (
        <div className="transcript">
          <h4>识别结果:</h4>
          <p>{transcript}</p>
        </div>
      )}
      
      <div className="debug-info" style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        状态: {isListening ? '录音中' : '待机'} | 权限: {permissionStatus} | 支持: {isSupported ? '是' : '否'}
      </div>
    </div>
  );
};

export default VoiceRecognition;