// src/components/chat/ChatTabDesktop.js - 修复权限处理
import { useState, useEffect, useCallback } from 'react';
import ChatTabBase from './ChatTabBase';
import useSpeech from '../../hooks/useSpeech';
import { getDeviceInfo, checkSpeechSupport, getPlatformLockInfo } from '../Utils/deviceUtils';

// 修复：通用的错误消息处理函数
const getErrorMessage = (error) => {
  if (!error) return '';
  
  try {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error && typeof error === 'object' && error.message) {
      return String(error.message);
    }
    
    return String(error);
  } catch (e) {
    console.error('错误消息转换失败:', e);
    return '发生未知错误';
  }
};

const ChatTabDesktop = ({ user, voiceEnabled, toggleVoice, className }) => {
  const [deviceInfo, setDeviceInfo] = useState({});
  const [speechSupport, setSpeechSupport] = useState({ supported: false, message: '' });
  const [localVoiceError, setLocalVoiceError] = useState(null);
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  
  const speech = useSpeech({
    timeout: 8000,
    onError: (error) => {
      console.error('语音识别错误:', error);
      // 修复：确保存储的是字符串而不是 Error 对象
      setLocalVoiceError(getErrorMessage(error));
      
      // 如果是权限错误，显示权限请求提示
      if (error.message && error.message.includes('权限被拒绝')) {
        setShowPermissionRequest(true);
      }
    },
    onResult: (result) => {
      console.log('桌面端语音识别结果:', result);
      setLocalVoiceError(null);
      setShowPermissionRequest(false);
    }
  });

  useEffect(() => {
    const info = getDeviceInfo();
    setDeviceInfo(info);
    
    const support = checkSpeechSupport();
    setSpeechSupport(support);
    
    const lockInfo = getPlatformLockInfo();
    
    console.log('💻 桌面端语音支持检测:', {
      browser: info.browser,
      support: support.supported,
      message: support.message,
      platform: support.platform,
      platform锁定: lockInfo.locked
    });
  }, []);

  // 修复：处理权限请求
  const handleRequestPermission = useCallback(async () => {
    try {
      if (speech.requestPermission) {
        const granted = await speech.requestPermission();
        if (granted) {
          setLocalVoiceError(null);
          setShowPermissionRequest(false);
        } else {
          setLocalVoiceError('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
        }
      } else {
        // 如果没有 requestPermission 方法，直接尝试开始监听
        await speech.startListening();
      }
    } catch (error) {
      console.error('请求权限失败:', error);
      setLocalVoiceError('请求麦克风权限失败: ' + getErrorMessage(error));
    }
  }, [speech]);

  // 修复：安全的语音切换处理
  const handleToggleVoiceInput = useCallback(async () => {
    if (!speechSupport.supported) {
      const errorMsg = '浏览器不支持语音识别: ' + speechSupport.message;
      console.warn('❌', errorMsg);
      setLocalVoiceError(errorMsg);
      return;
    }
    
    // 安全检查语音方法
    if (typeof speech.startListening !== 'function') {
      const errorMsg = '语音方法不可用';
      console.error('❌', errorMsg);
      setLocalVoiceError(errorMsg);
      return;
    }
    
    if (speech.listening) {
      console.log('🛑 停止语音识别');
      speech.stopListening();
    } else {
      try {
        console.log('🎤 开始语音识别');
        await speech.startListening();
      } catch (error) {
        console.error('启动语音识别失败:', error);
        setLocalVoiceError('启动语音识别失败: ' + getErrorMessage(error));
        
        // 如果是权限错误，显示权限请求提示
        if (error.message && error.message.includes('权限被拒绝')) {
          setShowPermissionRequest(true);
        }
      }
    }
  }, [speech, speechSupport]);

  // 修复：语音合成函数
  const speakText = useCallback((text) => {
    if (voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const chineseVoice = voices.find(voice => 
        voice.lang.includes('zh') || voice.lang.includes('CN')
      );
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled]);

  // 修复：错误处理
  const handleClearError = useCallback(() => {
    setLocalVoiceError(null);
    setShowPermissionRequest(false);
    if (speech.resetTranscript) {
      speech.resetTranscript();
    }
  }, [speech]);

  // 强制重置语音状态
  const handleForceReset = useCallback(() => {
    console.log('🔄 强制重置语音状态');
    if (speech.listening && speech.stopListening) {
      speech.stopListening();
    }
    if (speech.resetTranscript) {
      speech.resetTranscript();
    }
    setLocalVoiceError(null);
    setShowPermissionRequest(false);
  }, [speech]);

  // 权限请求UI组件
  const PermissionRequestUI = () => {
    if (!showPermissionRequest) return null;
    
    return (
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              需要麦克风权限
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>语音识别需要访问您的麦克风。请允许麦克风权限以使用语音功能。</p>
            </div>
            <div className="mt-4">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  允许麦克风权限
                </button>
                <button
                  type="button"
                  onClick={handleClearError}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  稍后再说
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 桌面端特定UI - 简化版本（移除会话有效提示）
  const desktopUI = (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">💻</span>
          <div>
            <div className="text-sm font-medium text-gray-900">桌面端语音识别</div>
            <div className="text-xs text-gray-600">
              {deviceInfo.browser}
              {!speech.isPlatformLocked && <span className="ml-2 text-green-600">🔄 平台可切换</span>}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleForceReset}
            className="px-2 py-1 bg-yellow-500 text-white text-xs rounded font-medium hover:bg-yellow-600"
          >
            重置
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div className="text-gray-600">
          支持: <span className={`font-medium ${
            speechSupport.supported ? 'text-green-600' : 'text-red-600'
          }`}>
            {speechSupport.supported ? '是' : '否'}
          </span>
        </div>
        <div className="text-gray-600">
          状态: <span className={`font-medium ${
            speech.status === 'listening' ? 'text-green-600' :
            speech.status === 'processing' ? 'text-blue-600' :
            speech.status === 'error' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {speech.status}
          </span>
        </div>
      </div>

      {/* 实时状态显示 - 简化 */}
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>平台:</span>
          <span className="text-purple-600 font-medium">
            {speech.platform === 'baidu' ? '百度语音' : speech.platform}
          </span>
        </div>
        <div className="flex justify-between">
          <span>监听:</span>
          <span className={speech.listening ? 'text-green-600 font-medium' : 'text-gray-600'}>
            {speech.listening ? '🟢 进行中' : '⚫ 未开始'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>权限:</span>
          <span className={
            speech.permissionState === 'granted' ? 'text-green-600' :
            speech.permissionState === 'denied' ? 'text-red-600' : 'text-yellow-600'
          }>
            {speech.permissionState || '未知'}
          </span>
        </div>
        {speech.transcript && (
          <div className="flex justify-between">
            <span>识别:</span>
            <span className="text-blue-600 truncate max-w-[150px]">{speech.transcript}</span>
          </div>
        )}
      </div>

      {speech.permissionState === 'denied' && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ❌ 麦克风权限被拒绝。请在浏览器设置中启用麦克风权限。
          <button 
            onClick={handleRequestPermission}
            className="ml-2 text-red-700 underline hover:text-red-800"
          >
            重新请求权限
          </button>
        </div>
      )}
      
      <div className="mt-2 text-xs text-blue-600">
        💡 点击麦克风按钮开始说话，再次点击停止
      </div>
    </div>
  );

  return (
    <div>
      <PermissionRequestUI />
      <ChatTabBase
        user={user}
        voiceEnabled={voiceEnabled}
        toggleVoice={toggleVoice}
        className={className}
        platformProps={{
          voiceState: speech,
          // 修复：确保传递的是字符串而不是 Error 对象
          voiceError: getErrorMessage(localVoiceError || speech.error),
          onToggleVoiceInput: handleToggleVoiceInput,
          onClearVoiceError: handleClearError,
          onForceReset: handleForceReset,
          onRequestPermission: handleRequestPermission,
          speakText,
          platformUI: desktopUI,
          interimTranscript: speech.interimTranscript
        }}
      />
    </div>
  );
};

export default ChatTabDesktop;