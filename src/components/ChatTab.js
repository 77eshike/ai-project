// components/ChatTab.js (完全重写版本)
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

// 基础组件保持不变
const LoadingIndicator = () => (
  <div className="flex justify-center items-center py-4">
    <div className="flex space-x-2">
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
    </div>
    <span className="ml-2 text-gray-600 text-sm">AI正在思考中...</span>
  </div>
);

const KnowledgeSaveModal = ({ message, onSave, onClose }) => {
  // ... 保持不变
};

const MessageItem = ({ message, voiceEnabled, onSpeak, onSaveAsKnowledge }) => {
  // ... 保持不变
};

const ConnectionIndicator = ({ status }) => {
  // ... 保持不变
};

// 修复：简化的语音识别 Hook
const useVoiceRecognition = () => {
  const [state, setState] = useState({
    isListening: false,
    isSupported: false,
    error: null,
    transcript: '',
    isMobile: false,
    browserInfo: ''
  });

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // 检查支持性
  useEffect(() => {
    const checkSupport = () => {
      if (typeof window === 'undefined') return;
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const isSupported = !!SpeechRecognition;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      let browserInfo = '桌面端';
      if (isMobile) {
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
          browserInfo = /safari/.test(ua) && !/chrome/.test(ua) ? 'iOS Safari' : 'iOS 其他浏览器';
        } else if (/android/.test(ua)) {
          browserInfo = /chrome/.test(ua) ? 'Android Chrome' : 'Android 其他浏览器';
        }
      }

      setState(prev => ({
        ...prev,
        isSupported,
        isMobile,
        browserInfo
      }));
    };

    checkSupport();
  }, []);

  // 停止识别
  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.log('停止识别时出错:', error);
    } finally {
      setState(prev => ({ ...prev, isListening: false }));
      recognitionRef.current = null;
    }
  }, []);

  // 开始识别
  const start = useCallback(() => {
    // 清理之前的实例
    if (recognitionRef.current) {
      stop();
    }

    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: '浏览器不支持语音识别' }));
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // 基本配置
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;

    // 重置状态
    finalTranscriptRef.current = '';
    setState(prev => ({ 
      ...prev, 
      isListening: true, 
      error: null, 
      transcript: '' 
    }));

    // 事件处理
    recognition.onstart = () => {
      console.log('✅ 语音识别开始');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current = finalTranscript;
        setState(prev => ({ ...prev, transcript: finalTranscript }));
      } else if (interimTranscript) {
        setState(prev => ({ ...prev, transcript: interimTranscript + '...' }));
      }
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      let errorMessage = '语音识别错误';
      
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = '麦克风权限被拒绝，请检查浏览器设置';
          break;
        case 'no-speech':
          errorMessage = '未检测到语音';
          break;
        default:
          errorMessage = `识别错误: ${event.error}`;
      }
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isListening: false 
      }));
    };

    recognition.onend = () => {
      console.log('语音识别结束');
      setState(prev => ({ ...prev, isListening: false }));
      recognitionRef.current = null;
    };

    // 启动识别
    try {
      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch (error) {
      console.error('启动失败:', error);
      setState(prev => ({ 
        ...prev, 
        error: '启动语音识别失败', 
        isListening: false 
      }));
      return false;
    }
  }, [state.isSupported, stop]);

  // 切换识别状态
  const toggle = useCallback(() => {
    if (state.isListening) {
      stop();
    } else {
      start();
    }
  }, [state.isListening, start, stop]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 获取最终转录文本
  const getFinalTranscript = useCallback(() => {
    return finalTranscriptRef.current;
  }, []);

  return {
    ...state,
    start,
    stop,
    toggle,
    clearError,
    getFinalTranscript
  };
};

export default function ChatTab({ voiceEnabled, toggleVoice }) {
  const { addKnowledge } = useKnowledge();
  
  const [chatMessages, setChatMessages] = useState([
    { 
      type: 'ai', 
      content: '您好！我是您的AI助手。我可以帮助您管理项目、解答问题或提供创意建议。请问有什么可以帮您的？', 
      time: new Date(),
      saved: false,
      id: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [savingMessage, setSavingMessage] = useState(null);
  
  // 使用修复后的语音识别 Hook
  const voiceRecognition = useVoiceRecognition();
  
  const messagesEndRef = useRef(null);
  const speechSynthesisRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // 语音播报
  const speakText = useCallback((text) => {
    if (!voiceEnabled || !speechSynthesisRef.current) return;
    
    if (voiceRecognition.isMobile) {
      console.log('移动端语音播报已禁用');
      return;
    }
    
    speechSynthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    
    speechSynthesisRef.current.speak(utterance);
  }, [voiceEnabled, voiceRecognition.isMobile]);

  // 保存知识点
  const handleSaveAsKnowledge = useCallback((message) => {
    setSavingMessage(message);
  }, []);

  const handleKnowledgeSave = useCallback((knowledgeData) => {
    addKnowledge(knowledgeData);
    setChatMessages(prev => prev.map(msg =>
      msg.id === savingMessage.id ? { ...msg, saved: true } : msg
    ));
    setSavingMessage(null);
  }, [addKnowledge, savingMessage]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isSending) return;
    
    // 如果正在语音识别，先停止
    if (voiceRecognition.isListening) {
      voiceRecognition.stop();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const cleanInput = chatInput.replace(/\.\.\.$/, '').trim();
    if (!cleanInput) return;
    
    const userMessage = {
      type: 'user',
      content: cleanInput,
      time: new Date(),
      saved: false,
      id: Date.now()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);
    
    try {
      setTimeout(() => {
        const aiMessage = {
          type: 'ai',
          content: `收到您的消息："${cleanInput}"。这是一个模拟回复，实际应用中会调用AI API。`,
          time: new Date(),
          saved: false,
          id: Date.now() + 1
        };
        
        setChatMessages(prev => [...prev, aiMessage]);
        setIsSending(false);
        
        if (voiceEnabled && !voiceRecognition.isMobile) {
          speakText(aiMessage.content);
        }
      }, 1000);
      
    } catch (error) {
      console.error('发送消息错误:', error);
      setIsSending(false);
    }
  }, [chatInput, isSending, voiceRecognition.isListening, voiceRecognition.stop, speakText, voiceEnabled, voiceRecognition.isMobile]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleClearChat = useCallback(() => {
    setChatMessages([{
      type: 'ai', 
      content: '聊天记录已清空。请问有什么可以帮您的？', 
      time: new Date(),
      saved: false,
      id: Date.now()
    }]);
  }, []);

  // 处理语音识别结果更新到输入框
  useEffect(() => {
    if (voiceRecognition.transcript && !voiceRecognition.isListening) {
      const finalText = voiceRecognition.getFinalTranscript();
      if (finalText) {
        setChatInput(finalText);
      }
    }
  }, [voiceRecognition.transcript, voiceRecognition.isListening, voiceRecognition.getFinalTranscript]);

  // 组件卸载清理
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      voiceRecognition.stop();
    };
  }, [voiceRecognition]);

  // 时间格式化
  const formatMessageTime = useCallback((time) => {
    if (!time) return new Date().toLocaleTimeString('zh-CN');
    if (time instanceof Date) {
      return time.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
    return new Date().toLocaleTimeString('zh-CN');
  }, []);

  // 消息元素渲染
  const messageElements = useMemo(() => {
    return chatMessages.map((message) => (
      <MessageItem 
        key={message.id}
        message={{
          ...message,
          time: formatMessageTime(message.time)
        }}
        voiceEnabled={voiceEnabled} 
        onSpeak={speakText}
        onSaveAsKnowledge={handleSaveAsKnowledge}
      />
    ));
  }, [chatMessages, voiceEnabled, speakText, handleSaveAsKnowledge, formatMessageTime]);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 py-5 sm:p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">AI助手对话</h3>
          <div className="flex items-center space-x-4">
            <ConnectionIndicator status={connectionStatus} />
            <button
              onClick={handleClearChat}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              title="清空聊天记录"
            >
              清空记录
            </button>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">语音播报</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={voiceEnabled}
                  onChange={(e) => toggleVoice(e.target.checked)}
                />
                <div className={`w-11 h-6 bg-gray-200 rounded-full transition-colors ${voiceEnabled ? 'bg-blue-600' : ''}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${voiceEnabled ? 'transform translate-x-5' : ''}`}></div>
              </label>
            </div>
          </div>
        </div>
        
        {/* 移动端提示 */}
        {voiceRecognition.isMobile && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-700">
              <span className="text-sm">📱 移动端模式: {voiceRecognition.browserInfo}</span>
            </div>
            <div className="mt-1 text-xs text-yellow-600">
              💡 提示: 首次使用需要允许麦克风权限
            </div>
          </div>
        )}
        
        <div className="border rounded-lg flex-1 overflow-y-auto p-4 mb-4 bg-gray-50 min-h-[300px]">
          <div className="space-y-4">
            {messageElements}
            {isSending && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={voiceRecognition.isMobile ? "输入文字或点击麦克风说话" : "输入您的问题或需求，或使用语音输入..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              disabled={isSending}
            />
            {voiceRecognition.isSupported && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  voiceRecognition.toggle();
                }}
                disabled={isSending}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${
                  voiceRecognition.isListening 
                    ? 'bg-red-100 text-red-600 border-2 border-red-300 animate-pulse' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                type="button"
                title={voiceRecognition.isListening ? '点击停止语音输入' : '点击开始语音输入'}
              >
                {voiceRecognition.isListening ? '🔴' : '🎤'}
              </button>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={isSending || !chatInput.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? '发送中...' : '发送'}
          </button>
        </div>

        {/* 语音状态指示 */}
        {voiceRecognition.isListening && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700">
              <div className="flex space-x-1 mr-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-sm font-medium">
                {voiceRecognition.isMobile ? "正在聆听...请靠近麦克风清晰说话" : "正在聆听...请开始说话"}
              </span>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {voiceRecognition.error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm text-red-700 whitespace-pre-wrap">{voiceRecognition.error}</div>
              </div>
              <div className="flex space-x-2 ml-3">
                <button
                  onClick={voiceRecognition.clearError}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                >
                  忽略
                </button>
                <button
                  onClick={voiceRecognition.start}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
            <div><strong>调试信息:</strong></div>
            <div>设备: {voiceRecognition.isMobile ? '移动端' : '桌面端'} | 浏览器: {voiceRecognition.browserInfo}</div>
            <div>支持: {voiceRecognition.isSupported ? '是' : '否'} | 监听中: {voiceRecognition.isListening ? '是' : '否'}</div>
            <div>转录: "{voiceRecognition.transcript || '空'}"</div>
          </div>
        )}
      </div>

      {/* 知识点保存模态框 */}
      {savingMessage && (
        <KnowledgeSaveModal
          message={savingMessage}
          onSave={handleKnowledgeSave}
          onClose={() => setSavingMessage(null)}
        />
      )}
    </div>
  );
}