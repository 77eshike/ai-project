// components/ChatTab.js (完全修复版本)
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

// LoadingIndicator 组件定义
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

// KnowledgeSaveModal 组件定义
const KnowledgeSaveModal = ({ message, onSave, onClose }) => {
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const categories = ['技术', '产品', '设计', '运营', '市场', '其他'];

  const handleSave = async () => {
    if (!category.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        content: message.content,
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        source: 'chat',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('保存知识点失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">保存到知识库</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类 *
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择分类</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签（用逗号分隔）
              </label>
              <input 
                type="text" 
                value={tags} 
                onChange={(e) => setTags(e.target.value)}
                placeholder="例如：AI,机器学习,编程"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">预览内容：</h4>
              <p className="text-sm text-gray-600">{message.content}</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isSaving}
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              disabled={!category || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// MessageItem组件
const MessageItem = ({ message, voiceEnabled, onSpeak, onSaveAsKnowledge }) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (time) => {
    if (typeof time === 'string') return time;
    if (time instanceof Date) return time.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
    return new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div 
      className={`mb-4 ${message.type === 'user' ? 'text-right' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`inline-block p-3 rounded-lg max-w-xs md:max-w-md relative ${
        message.type === 'user' 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        <div className="break-words whitespace-pre-wrap">{message.content}</div>
        
        {message.type === 'ai' && (
          <div className={`absolute -top-2 -right-2 flex space-x-1 transition-opacity duration-200 ${
            showActions ? 'opacity-100' : 'opacity-0'
          }`}>
            {voiceEnabled && (
              <button 
                onClick={() => onSpeak(message.content)}
                className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 transition-colors shadow-sm"
                title="播放语音"
              >
                🔊
              </button>
            )}
            <button 
              onClick={() => onSaveAsKnowledge(message)}
              className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600 transition-colors shadow-sm"
              title="保存到知识库"
              disabled={message.saved}
            >
              💾
            </button>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-1 flex items-center justify-end space-x-2">
        <span>{formatTime(message.time)}</span>
        {message.saved && (
          <span className="text-green-600">已保存</span>
        )}
      </div>
    </div>
  );
};

// 连接状态指示器组件
const ConnectionIndicator = ({ status }) => {
  const statusConfig = {
    connected: { color: 'text-green-500', text: '已连接' },
    connecting: { color: 'text-yellow-500', text: '思考中...' },
    error: { color: 'text-red-500', text: '连接错误' }
  };
  
  const config = statusConfig[status] || statusConfig.connected;
  
  return (
    <div className={`flex items-center text-sm ${config.color}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${config.color.replace('text', 'bg')}`}></div>
      {config.text}
    </div>
  );
};

// 移动端检测函数
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 浏览器支持检测函数
const checkMobileBrowserSupport = () => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: '不在浏览器环境中' };
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;
  
  // 移动端特定检测
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isChrome = /chrome/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  
  let mobileSupportInfo = '未知';
  
  if (isIOS) {
    if (isSafari) {
      // iOS Safari 14+ 支持有限
      mobileSupportInfo = 'iOS Safari (有限支持)';
    } else {
      mobileSupportInfo = 'iOS 其他浏览器 (支持较差)';
    }
  } else if (isAndroid) {
    if (isChrome) {
      mobileSupportInfo = 'Android Chrome (良好支持)';
    } else {
      mobileSupportInfo = 'Android 其他浏览器 (支持有限)';
    }
  }
  
  return {
    supported: isSupported,
    SpeechRecognition: !!window.SpeechRecognition,
    webkitSpeechRecognition: !!window.webkitSpeechRecognition,
    isMobile: isMobileDevice(),
    mobileInfo: mobileSupportInfo,
    userAgent: navigator.userAgent
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
  const [voiceError, setVoiceError] = useState(null);
  
  // 语音识别状态管理
  const [voiceState, setVoiceState] = useState({
    isListening: false,
    status: 'idle',
    isSupported: false,
    permissionState: 'unknown',
    isMobile: false,
    browserInfo: '',
    waitingForPermission: false
  });
  
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const speechSynthesisRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const stopTimeoutRef = useRef(null);
  const permissionTimeoutRef = useRef(null);

  // 修复：停止语音识别函数（必须先定义）
  const stopVoiceInput = useCallback(() => {
    console.log('🛑 停止语音识别调用');
    
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    if (permissionTimeoutRef.current) {
      clearTimeout(permissionTimeoutRef.current);
      permissionTimeoutRef.current = null;
    }
    
    if (!recognitionRef.current) {
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        status: 'idle',
        waitingForPermission: false
      }));
      return;
    }
    
    if (!voiceState.isListening && !voiceState.waitingForPermission) return;
    
    try {
      setVoiceState(prev => ({ 
        ...prev, 
        status: 'stopping',
        waitingForPermission: false 
      }));
      recognitionRef.current.stop();
      
      stopTimeoutRef.current = setTimeout(() => {
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          status: 'idle',
          waitingForPermission: false
        }));
        recognitionRef.current = null;
      }, 2000);
      
    } catch (error) {
      console.error('停止语音识别时出错:', error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        status: 'error',
        waitingForPermission: false
      }));
      recognitionRef.current = null;
    }
  }, [voiceState.isListening, voiceState.waitingForPermission]);

  // 修复：优化语音识别初始化函数
  const initializeRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('❌ 浏览器不支持语音识别');
      setVoiceError('当前浏览器不支持语音识别功能');
      return null;
    }
    
    // 清理之前的实例
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      } catch (error) {
        console.log('清理旧实例时出错:', error);
      }
    }
    
    const recognition = new SpeechRecognition();
    
    // 简化配置，专注于移动端兼容性
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;
    
    // 统一事件处理，减少移动端和桌面端的差异
    recognition.onstart = () => {
      console.log('✅ 语音识别开始');
      setVoiceState(prev => ({
        ...prev,
        isListening: true,
        status: 'listening',
        waitingForPermission: false
      }));
      setVoiceError(null);
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      
      // 清除权限等待超时
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }
      
      // 设置超时保护
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      stopTimeoutRef.current = setTimeout(() => {
        if (voiceState.isListening) {
          console.log('⏰ 语音识别超时');
          stopVoiceInput();
          setVoiceError('语音识别超时，请重试');
        }
      }, 10000);
    };
    
    recognition.onresult = (event) => {
      console.log('🔊 收到语音识别结果');
      
      // 清除超时
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      
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
        setChatInput(finalTranscript);
      } else if (interimTranscript) {
        setChatInput(interimTranscript + '...');
      }
    };
    
    recognition.onerror = (event) => {
      console.error('❌ 语音识别错误:', event.error);
      
      // 清除超时
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }
      
      let errorMessage = '语音识别错误';
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = '麦克风权限被拒绝。请点击地址栏左侧的锁形图标，选择"网站设置"，允许麦克风权限。';
          setVoiceState(prev => ({ 
            ...prev, 
            permissionState: 'denied',
            waitingForPermission: false 
          }));
          break;
        case 'no-speech':
          errorMessage = '未检测到语音，请确保在安静环境中清晰说话';
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风，请检查设备设置';
          break;
        case 'network':
          errorMessage = '网络错误，请检查网络连接';
          break;
        default:
          errorMessage = `识别错误: ${event.error}`;
      }
      
      setVoiceError(errorMessage);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        status: 'error',
        waitingForPermission: false
      }));
    };
    
    recognition.onend = () => {
      console.log('🛑 语音识别结束');
      
      // 清除超时
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }
      
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        status: 'idle',
        waitingForPermission: false
      }));
      
      // 延迟处理最终结果，确保状态更新完成
      setTimeout(() => {
        if (finalTranscriptRef.current) {
          setChatInput(finalTranscriptRef.current);
        } else {
          console.log('未识别到有效语音内容');
        }
      }, 300);
    };
    
    return recognition;
  }, [voiceState.isListening, stopVoiceInput]);

  // 修复：优化启动语音输入函数，添加权限等待处理
  const startVoiceInput = useCallback(async () => {
    // 重置状态
    setVoiceError(null);
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    
    if (!voiceState.isSupported) {
      setVoiceError('浏览器不支持语音识别');
      return false;
    }
    
    if (voiceState.isListening) {
      console.log('语音识别已在运行中');
      return false;
    }
    
    console.log('🎤 开始语音输入流程...');
    
    // 移动端特殊处理：如果正在等待权限，不再重复启动
    if (voiceState.waitingForPermission) {
      console.log('⏳ 正在等待权限确认，请稍候...');
      return false;
    }
    
    setVoiceState(prev => ({ 
      ...prev, 
      status: 'starting',
      waitingForPermission: voiceState.isMobile
    }));
    
    try {
      // 直接初始化并启动，让浏览器处理权限提示
      recognitionRef.current = initializeRecognition();
      if (!recognitionRef.current) {
        throw new Error('无法初始化语音识别器');
      }
      
      // 移动端特殊处理：显示权限等待提示
      if (voiceState.isMobile) {
        setVoiceError('请在弹出的权限窗口中允许麦克风访问...');
        
        // 设置权限等待超时
        permissionTimeoutRef.current = setTimeout(() => {
          if (voiceState.waitingForPermission && !voiceState.isListening) {
            console.log('⏰ 权限等待超时');
            setVoiceState(prev => ({ ...prev, waitingForPermission: false }));
            setVoiceError('权限确认超时，请重试或检查浏览器设置');
            
            // 尝试停止可能正在等待的识别
            try {
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
            } catch (error) {
              console.log('停止等待中的识别器:', error);
            }
          }
        }, 5000);
      }
      
      // 立即启动，让浏览器处理权限提示
      recognitionRef.current.start();
      console.log('🚀 启动语音识别成功');
      
      return true;
      
    } catch (error) {
      console.error('启动语音识别失败:', error);
      
      // 清除权限等待超时
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }
      
      // 移动端特定错误处理
      if (voiceState.isMobile) {
        if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
          setVoiceError('麦克风权限被拒绝。请点击地址栏左侧的锁形图标，选择"网站设置"，允许麦克风权限后重试。');
        } else {
          setVoiceError('启动失败: ' + error.message);
        }
      } else {
        setVoiceError('启动语音识别失败: ' + error.message);
      }
      
      setVoiceState(prev => ({ 
        ...prev, 
        status: 'error',
        waitingForPermission: false 
      }));
      return false;
    }
  }, [voiceState.isSupported, voiceState.isListening, voiceState.isMobile, voiceState.waitingForPermission, initializeRecognition]);

  // 切换语音输入
  const toggleVoiceInput = useCallback(async () => {
    if (voiceState.status === 'starting' || voiceState.status === 'stopping') {
      return;
    }
    
    if (voiceState.isListening) {
      stopVoiceInput();
    } else {
      await startVoiceInput();
    }
  }, [voiceState.isListening, voiceState.status, startVoiceInput, stopVoiceInput]);

  // 清除错误
  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
    // 同时重置等待状态
    setVoiceState(prev => ({ ...prev, waitingForPermission: false }));
  }, []);

  // 修复：简化移动端快速测试
  const mobileQuickTest = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('❌ 浏览器不支持语音识别');
      return;
    }
    
    console.log('🔊 开始移动端快速测试...');
    setVoiceError('🎤 测试中...请允许麦克风权限后说话');
    
    // 设置测试状态
    setVoiceState(prev => ({ ...prev, waitingForPermission: true }));
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    let testTimeout;
    
    recognition.onstart = () => {
      console.log('移动端测试开始');
      setVoiceState(prev => ({ ...prev, waitingForPermission: false }));
      setVoiceError('🎤 正在聆听...请说"测试123"');
      
      testTimeout = setTimeout(() => {
        recognition.stop();
        setVoiceError('⏰ 测试超时，未检测到语音');
      }, 8000);
    };
    
    recognition.onresult = (event) => {
      clearTimeout(testTimeout);
      const result = event.results[0];
      const transcript = result[0].transcript;
      
      if (result.isFinal && transcript) {
        setVoiceError(`✅ 测试成功！识别结果: "${transcript}"`);
      }
      
      recognition.stop();
    };
    
    recognition.onend = () => {
      clearTimeout(testTimeout);
      setVoiceState(prev => ({ ...prev, waitingForPermission: false }));
      console.log('移动端测试结束');
    };
    
    recognition.onerror = (event) => {
      clearTimeout(testTimeout);
      setVoiceState(prev => ({ ...prev, waitingForPermission: false }));
      
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setVoiceError('❌ 测试失败: 麦克风权限被拒绝。请允许权限后重试。');
      } else {
        setVoiceError(`❌ 测试失败: ${event.error}`);
      }
    };
    
    try {
      recognition.start();
    } catch (error) {
      setVoiceState(prev => ({ ...prev, waitingForPermission: false }));
      setVoiceError('❌ 测试启动失败: ' + error.message);
    }
  }, []);

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
    
    // 移动端禁用语音播报或降低要求
    if (isMobileDevice()) {
      console.log('移动端语音播报已禁用');
      return;
    }
    
    speechSynthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    
    speechSynthesisRef.current.speak(utterance);
  }, [voiceEnabled]);

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
    
    if (voiceState.isListening || voiceState.waitingForPermission) {
      stopVoiceInput();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const cleanInput = chatInput.replace(/\.\.\.$/, '').replace(/🎤$/, '').trim();
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
        
        if (voiceEnabled && !isMobileDevice()) {
          speakText(aiMessage.content);
        }
      }, 1000);
      
    } catch (error) {
      console.error('发送消息错误:', error);
      setIsSending(false);
    }
  }, [chatInput, isSending, voiceState.isListening, voiceState.waitingForPermission, stopVoiceInput, speakText, voiceEnabled]);

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

  // 修复：延迟环境检测，确保DOM加载完成
  useEffect(() => {
    const initializeVoiceRecognition = () => {
      if (typeof window === 'undefined') return;
      
      const supportInfo = checkMobileBrowserSupport();
      console.log('📱 环境检测结果:', supportInfo);
      
      setVoiceState(prev => ({
        ...prev,
        isSupported: supportInfo.supported,
        isMobile: supportInfo.isMobile,
        browserInfo: supportInfo.mobileInfo,
        permissionState: 'prompt'
      }));
      
      if (supportInfo.isMobile && !supportInfo.supported) {
        setVoiceError(`移动端浏览器支持有限。建议使用 Chrome 或 Safari 最新版本。`);
      }
    };
    
    setTimeout(initializeVoiceRecognition, 100);
    
    // 清理函数
    return () => {
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
      }
    };
  }, []);

  // 组件卸载清理
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {}
      }
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
      }
    };
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
        
        {/* 移动端特定提示 */}
        {voiceState.isMobile && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-700">
              <span className="text-sm">📱 移动端模式: {voiceState.browserInfo}</span>
            </div>
            {voiceState.isMobile && (
              <div className="mt-1 text-xs text-yellow-600">
                💡 提示: 首次使用需要允许麦克风权限
              </div>
            )}
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
              placeholder={voiceState.isMobile ? "输入文字或点击麦克风说话" : "输入您的问题或需求，或使用语音输入..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              disabled={isSending}
            />
            {voiceState.isSupported && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleVoiceInput();
                }}
                disabled={isSending || voiceState.status === 'starting' || voiceState.status === 'stopping' || voiceState.waitingForPermission}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${
                  voiceState.isListening 
                    ? 'bg-red-100 text-red-600 border-2 border-red-300 animate-pulse' 
                    : voiceState.waitingForPermission
                    ? 'bg-yellow-100 text-yellow-600 border-2 border-yellow-300 animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${
                  voiceState.status === 'starting' || voiceState.status === 'stopping' || voiceState.waitingForPermission
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer'
                }`}
                type="button"
                title={
                  voiceState.waitingForPermission ? '等待权限确认...' :
                  voiceState.isListening ? '点击停止语音输入' : 
                  voiceState.status === 'starting' ? '语音识别启动中...' :
                  voiceState.status === 'stopping' ? '正在停止...' :
                  '点击开始语音输入'
                }
              >
                {voiceState.waitingForPermission ? '🟡' :
                 voiceState.isListening ? '🔴' : 
                 voiceState.status === 'starting' ? '⏳' :
                 voiceState.status === 'stopping' ? '⏳' : '🎤'}
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
        {voiceState.isListening && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700">
              <div className="flex space-x-1 mr-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-sm font-medium">
                {voiceState.isMobile ? "正在聆听...请靠近麦克风清晰说话" : "正在聆听...请开始说话"}
              </span>
            </div>
          </div>
        )}

        {/* 权限等待指示 */}
        {voiceState.waitingForPermission && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-700">
              <div className="flex space-x-1 mr-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              <span className="text-sm font-medium">
                等待权限确认...请在弹出的窗口中允许麦克风访问
              </span>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {voiceError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm text-red-700 whitespace-pre-wrap">{voiceError}</div>
              </div>
              <div className="flex space-x-2 ml-3">
                <button
                  onClick={clearVoiceError}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                >
                  忽略
                </button>
                <button
                  onClick={voiceState.isMobile ? mobileQuickTest : toggleVoiceInput}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                >
                  {voiceState.isMobile ? '测试' : '重试'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
            <div><strong>调试信息:</strong></div>
            <div>设备: {voiceState.isMobile ? '移动端' : '桌面端'} | 浏览器: {voiceState.browserInfo}</div>
            <div>状态: {voiceState.status} | 监听中: {voiceState.isListening ? '是' : '否'}</div>
            <div>权限: {voiceState.permissionState} | 支持: {voiceState.isSupported ? '是' : '否'}</div>
            <div>等待权限: {voiceState.waitingForPermission ? '是' : '否'}</div>
            <div>最终结果: "{finalTranscriptRef.current || '空'}"</div>
            <div>临时结果: "{interimTranscriptRef.current || '空'}"</div>
            
            <div className="mt-2 flex space-x-2 flex-wrap">
              <button 
                onClick={() => {
                  console.log('环境信息:', checkMobileBrowserSupport());
                  console.log('语音状态:', voiceState);
                }}
                className="text-blue-600 underline"
              >
                环境检测
              </button>
              
              <button 
                onClick={mobileQuickTest}
                className="text-green-600 underline"
              >
                快速测试
              </button>
            </div>
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