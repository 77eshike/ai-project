// src/components/chat/ChatTabMobile.js - 修复版本
import { useState, useRef, useCallback, useEffect } from 'react';
import ChatTabBase from './ChatTabBase';
import useSpeech from '../../hooks/useSpeech';

const ChatTabMobile = ({ user, voiceEnabled, toggleVoice, className }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [localError, setLocalError] = useState(null);
  const buttonRef = useRef(null);
  
  // 用于存储 ChatTabBase 的发送消息函数
  const sendMessageRef = useRef(null);
  
  const speech = useSpeech({
    onResult: (result) => {
      console.log('收到语音结果:', result);
      // 语音识别完成后自动发送识别结果
      if (result && result.trim() && sendMessageRef.current) {
        console.log('自动发送语音识别结果:', result);
        sendMessageRef.current(result);
        setLocalError(null);
      }
    },
    onError: (error) => {
      console.error('语音识别错误:', error);
      setLocalError(error.message || '语音识别失败');
    }
  });

  // 触摸开始处理
  const handleTouchStart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('触摸开始 - 开始录音');
    setIsPressing(true);
    setLocalError(null);

    try {
      await speech.startListening();
      console.log('语音录音启动成功');
    } catch (error) {
      console.error('启动语音录音失败:', error);
      setIsPressing(false);
      setLocalError('启动语音识别失败');
    }
  }, [speech]);

  // 触摸结束处理
  const handleTouchEnd = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('触摸结束 - 停止录音并自动发送');
    setIsPressing(false);

    if (speech.listening) {
      try {
        await speech.stopListening();
        console.log('语音录音停止成功，等待识别结果...');
      } catch (error) {
        console.error('停止语音录音失败:', error);
        setLocalError('停止录音失败');
      }
    }
  }, [speech]);

  // 触摸取消处理
  const handleTouchCancel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('触摸取消 - 停止录音');
    setIsPressing(false);
    
    if (speech.listening) {
      speech.abort();
    }
  }, [speech]);

  // 接收 ChatTabBase 的发送消息函数
  const handleChatTabBaseReady = useCallback((sendMessageFunction) => {
    sendMessageRef.current = sendMessageFunction;
  }, []);

  // 清除错误
  const handleClearError = useCallback(() => {
    setLocalError(null);
    if (speech.resetTranscript) {
      speech.resetTranscript();
    }
  }, [speech]);

  // 移动端底部语音控制区域
  const mobileBottomUI = (
    <div className="p-4 bg-white border-t border-gray-200 safe-area-padding-bottom">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">语音输入</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">播报</span>
          <button
            onClick={() => toggleVoice(!voiceEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                voiceEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      
      {/* 语音按钮 - 直接使用 React 事件 */}
      <div className="flex flex-col items-center">
        <button
          ref={buttonRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchCancel}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200 text-white font-bold text-2xl
            relative touch-manipulation shadow-2xl
            ${isPressing || speech.listening 
              ? 'bg-red-500 ring-8 ring-red-200 scale-110' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }
          `}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '80px',
            minHeight: '80px',
          }}
        >
          {isPressing || speech.listening ? '🎙️' : '🎤'}
        </button>

        {/* 状态指示器 */}
        <div className="mt-3 text-center min-h-6">
          {speech.listening && (
            <div className="text-sm text-green-600 font-medium">
              正在聆听中...
            </div>
          )}
          {speech.isProcessing && (
            <div className="text-sm text-blue-600 font-medium">
              识别...
            </div>
          )}
        </div>

        {/* 实时识别结果 */}
        {speech.transcript && (
          <div className="w-full mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-gray-800">
            <div className="break-words">{speech.transcript}</div>
          </div>
        )}

        {/* 错误提示 */}
        {(localError || speech.error) && (
          <div className="w-full mt-3 p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                ❌ {localError || speech.error}
              </div>
              <button
                onClick={handleClearError}
                className="text-red-500 hover:text-red-700 ml-2 transition-colors"
                title="清除错误"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* 主要聊天区域 */}
      <div className="flex-1">
        <ChatTabBase
          user={user}
          voiceEnabled={voiceEnabled}
          toggleVoice={toggleVoice}
          className="h-full"
          isMobile={true}
          onSendMessageReady={handleChatTabBaseReady}
          platformProps={{
            cleanTextForSpeech: (text) => {
              if (!text) return '';
              return text
                .replace(/[”“"「」『』《》【】（）(){}<>]/g, ' ')
                .replace(/[.,?!，。？！、；：]/g, ' ')
                .replace(/\*|#|-|_|~|`|\||\\/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/[\u{1F600}-\u{1F64F}]/gu, ' ')
                .replace(/[\u{1F300}-\u{1F5FF}]/gu, ' ')
                .replace(/[\u{1F680}-\u{1F6FF}]/gu, ' ')
                .replace(/[\u{1F900}-\u{1F9FF}]/gu, ' ')
                .replace(/[\u{2600}-\u{26FF}]/gu, ' ')
                .replace(/[\u{2700}-\u{27BF}]/gu, ' ')
                .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ' ')
                .trim();
            }
          }}
        />
      </div>
      
      {/* 底部语音控制区域 */}
      {mobileBottomUI}

      <style jsx>{`
        .safe-area-padding-bottom {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
        }
      `}</style>
    </div>
  );
};

export default ChatTabMobile;