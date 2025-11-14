// src/components/chat/ChatTabBase.js - 修复版本
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useKnowledge } from '../../contexts/KnowledgeContext';

// 样式定义
const chatStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn { animation: fadeIn 0.3s ease-out; }
.animate-fadeInUp { animation: fadeInUp 0.4s ease-out; }
`;

if (typeof document !== 'undefined' && !document.getElementById('chat-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'chat-styles';
  styleSheet.innerText = chatStyles;
  document.head.appendChild(styleSheet);
}

// 知识保存模态框组件
const KnowledgeSaveModal = ({ message, onSave, onClose }) => {
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const categories = ['技术', '产品', '设计', '运营', '市场', '文档', '学习', '个人', '其他'];

  useEffect(() => {
    // 自动生成标题
    if (message?.content && !title) {
      const content = message.content;
      const firstLine = content.split('\n')[0];
      const generatedTitle = firstLine.length > 50 
        ? firstLine.substring(0, 47) + '...' 
        : firstLine;
      setTitle(generatedTitle);
    }
  }, [message, title]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入标题');
      return;
    }
    
    if (!category.trim()) {
      setError('请选择分类');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const knowledgeData = {
        title: title.trim(),
        content: message.content,
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        source: 'AI对话',
        metadata: {
          originalMessageId: message.id,
          messageType: message.type,
          conversationContext: 'AI对话保存'
        }
      };

      await onSave(knowledgeData);
      onClose();
    } catch (error) {
      console.error('保存知识点失败:', error);
      setError(error.message || '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">保存到知识库</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标题 *
              </label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入知识点标题"
              />
            </div>
            
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
                onKeyPress={handleKeyPress}
                placeholder="例如：AI,机器学习,编程"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2">预览内容：</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              disabled={!title || !category || isSaving}
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

const ChatTabBase = ({ 
  user, 
  className = '', 
  isMobile = false,
  onSendMessageReady,
  platformProps = {}
}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savingMessage, setSavingMessage] = useState(null);
  const [toast, setToast] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // 使用知识库上下文
  const { addKnowledge } = useKnowledge();

  // 显示 toast 提示
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 语音切换函数
  const handleVoiceToggle = useCallback((enabled) => {
    console.log('🔊 语音播报切换:', enabled);
    
    // 停止当前语音
    if (!enabled) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
    
    setVoiceEnabled(enabled);
  }, []);

  // 文本转语音功能
  const speakMessage = useCallback((text) => {
    if (!voiceEnabled || !text || !('speechSynthesis' in window)) return;

    try {
      // 停止之前的语音
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      
      utterance.onstart = () => {
        console.log('🔊 开始语音播报');
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('🔊 语音播报结束');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.warn('🔊 语音播报错误:', event.error);
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('语音播报失败:', error);
      setIsSpeaking(false);
    }
  }, [voiceEnabled]);

  // 停止语音播报
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // 语音开关组件
  const VoiceToggleButton = useMemo(() => {
    return function VoiceToggleButtonComponent() {
      return (
        <button
          onClick={() => {
            console.log('🎯 点击语音开关，当前状态:', voiceEnabled);
            handleVoiceToggle(!voiceEnabled);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
          type="button"
          aria-label={voiceEnabled ? '关闭语音播报' : '开启语音播报'}
          title={voiceEnabled ? '关闭语音播报' : '开启语音播报'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              voiceEnabled ? 'translate-x-6' : 'translate-x-1'
            } ${isSpeaking ? 'animate-pulse' : ''}`}
          />
        </button>
      );
    };
  }, [voiceEnabled, isSpeaking, handleVoiceToggle]);

  // 保存消息到知识库
  const handleSaveToKnowledge = useCallback(async (knowledgeData) => {
    try {
      console.log('💾 保存到知识库:', {
        title: knowledgeData.title,
        category: knowledgeData.category,
        tags: knowledgeData.tags
      });
      
      const result = await addKnowledge(knowledgeData);
      
      if (result.success) {
        showToast('✅ 已保存到知识库', 'success');
        return result;
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('❌ 保存到知识库失败:', error);
      showToast(`❌ 保存失败: ${error.message}`, 'error');
      throw error;
    }
  }, [addKnowledge, showToast]);

  // 处理消息保存
  const handleSaveMessage = useCallback((message) => {
    if (message.type === 'ai') {
      setSavingMessage(message);
    } else {
      showToast('只能保存AI回复的消息', 'warning');
    }
  }, [showToast]);

  // 关闭保存模态框
  const handleCloseSaveModal = useCallback(() => {
    setSavingMessage(null);
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 处理指令响应
  const handleCommandResponse = useCallback((commandResult) => {
    if (commandResult.success) {
      showToast(`✅ ${commandResult.message}`, 'success');
    } else {
      showToast(`❌ ${commandResult.message}`, 'error');
    }
  }, [showToast]);

  // 发送消息到真实AI API
  const handleSendMessage = useCallback(async (text = null) => {
    const messageContent = String(text || inputText || '').trim();
    if (!messageContent || isLoading) return;

    // 用户认证检查
    if (!user || !user.id) {
      setError('用户未认证，请重新登录');
      const errorMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: '请先登录后再使用聊天功能',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setIsLoading(true);
    setError(null);

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageContent,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!text) setInputText('');

    try {
      // 真实AI API调用
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({
          message: messageContent,
          conversationId: currentConversationId,
          mode: 'general',
          userId: user.id,
          voiceEnabled: voiceEnabled
        })
      });

      // 处理401认证错误
      if (response.status === 401) {
        const authErrorMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: '登录会话已过期，请刷新页面重新登录',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, authErrorMessage]);
        setError('登录已过期，请刷新页面');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'AI服务暂时不可用');
      }

      // 更新对话ID
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }

      // 处理AI响应
      let aiMessage;
      if (data.isCommand) {
        aiMessage = {
          id: Date.now() + 1,
          type: 'command',
          content: data.response || data.reply,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          commandData: data.commandResult
        };
        if (data.commandResult) {
          handleCommandResponse(data.commandResult);
        }
      } else {
        aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.response || data.reply || '抱歉，我暂时无法回复这个问题。',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          metadata: {
            model: data.model,
            tokens: data.tokens,
            processingTime: data.processingTime
          }
        };
      }

      setMessages(prev => [...prev, aiMessage]);

      // 语音播报
      if (voiceEnabled && !data.isCommand && (data.response || data.reply)) {
        speakMessage(data.response || data.reply);
      }

    } catch (error) {
      console.error('❌ AI对话失败:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: `抱歉，服务暂时不可用: ${error.message}`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, user, voiceEnabled, currentConversationId, handleCommandResponse, speakMessage]);

  // 将发送消息函数暴露给父组件
  useEffect(() => {
    if (onSendMessageReady) {
      onSendMessageReady(handleSendMessage);
    }
  }, [onSendMessageReady, handleSendMessage]);

  // 事件处理函数
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim() && !isLoading) {
        handleSendMessage();
      }
    }
  }, [handleSendMessage, inputText, isLoading]);

  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
  }, []);

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    stopSpeech();
    showToast('对话已清空', 'info');
  }, [stopSpeech, showToast]);

  // 自动调整输入框高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  // 组件卸载时停止语音
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'ai',
        content: '您好！我是您的AI助手。我可以帮助您解答问题、提供建议、协助创作等。您可以将重要的对话内容保存到知识库中。',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const isSendDisabled = !inputText.trim() || isLoading;

  // 快捷提示消息
  const quickSuggestions = useMemo(() => [
    { text: '你好，请介绍一下你自己', emoji: '👋' },
    { text: '你能帮我做什么？', emoji: '❓' },
    { text: '写一个简单的JavaScript函数', emoji: '💻' },
    { text: '推荐一些学习资源', emoji: '📚' },
    { text: '解释一下机器学习的基本概念', emoji: '🤖' },
    { text: '帮我规划一下今天的工作', emoji: '📅' }
  ], []);

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' :
          toast.type === 'error' ? 'bg-red-500' : 
          toast.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI 聊天助手</h2>
            <p className="text-xs text-gray-600">
              {user && user.id ? `用户ID: ${user.id}` : '未认证'}
              {currentConversationId && ` · 会话ID: ${currentConversationId.slice(0, 8)}...`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {messages.length > 1 && (
            <button
              onClick={handleClearConversation}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1 rounded-lg hover:bg-gray-100"
              title="清空对话"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              清空
            </button>
          )}
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 hidden sm:block">
              语音播报 {voiceEnabled ? '(开)' : '(关)'}
            </span>
            <VoiceToggleButton />
          </div>
        </div>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 font-medium">错误</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              
              {(error.includes('登录') || error.includes('认证')) && (
                <div className="mt-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors mr-2"
                  >
                    刷新页面
                  </button>
                  <button
                    onClick={() => window.location.href = '/auth/signin'}
                    className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                  >
                    重新登录
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleClearError}
              className="text-red-500 hover:text-red-700 ml-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
            <div className="text-6xl mb-6 animate-bounce">🤖</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">欢迎使用 AI 聊天助手</h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              我可以帮助您解答问题、提供建议、协助创作等。您可以将重要的对话内容保存到知识库中。
            </p>
            
            <div className="w-full max-w-md">
              <div className="grid gap-2">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputText(suggestion.text)}
                    className="text-sm text-gray-700 bg-white hover:bg-gray-50 px-4 py-3 rounded-lg border transition-all duration-200 text-left hover:shadow-sm hover:border-blue-200"
                  >
                    <span className="mr-2">{suggestion.emoji}</span>
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-fadeInUp ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  message.type === 'user' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
                  message.type === 'ai' ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                  'bg-gradient-to-r from-green-500 to-green-600'
                }`}>
                  <span className="text-white text-xs font-bold">
                    {message.type === 'user' ? '您' : 
                     message.type === 'ai' ? 'AI' : '系统'}
                  </span>
                </div>

                <div className={`max-w-[85%] ${isMobile ? 'max-w-[75%]' : ''} ${
                  message.type === 'user' ? 'text-right' : ''
                }`}>
                  <div
                    className={`inline-block px-4 py-3 rounded-2xl relative group ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : message.type === 'ai'
                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                        : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* AI消息的操作按钮 */}
                    {message.type === 'ai' && (
                      <div className="absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => speakMessage(message.content)}
                          className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 transition-colors shadow-sm"
                          title="播放语音"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleSaveMessage(message)}
                          className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600 transition-colors shadow-sm"
                          title="保存到知识库"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className={`text-xs text-gray-500 mt-2 flex items-center ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    {message.time}
                    {message.metadata && (
                      <span className="ml-2 text-gray-400">
                        {message.metadata.model && `模型: ${message.metadata.model}`}
                        {message.metadata.tokens && ` · Tokens: ${message.metadata.tokens}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 animate-fadeIn">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3 text-gray-600">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm font-medium">AI正在思考中...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isMobile ? "输入消息..." : "输入您的问题...（Enter发送，Shift+Enter换行）"}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all bg-white"
              rows="1"
              disabled={isLoading}
              style={{
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />
            <div className="absolute bottom-2 right-3 text-xs text-gray-400 bg-white px-1 rounded">
              {inputText.length}/1000
            </div>
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={isSendDisabled}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center min-w-[80px] justify-center font-medium shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                发送中
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                发送
              </>
            )}
          </button>
        </div>

        {/* 输入提示 */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          {isLoading ? 'AI正在处理您的请求，请稍候...' : '输入您的问题，AI助手会为您解答。您可以将重要的回复保存到知识库。'}
        </div>
      </div>

      {/* 知识保存模态框 */}
      {savingMessage && (
        <KnowledgeSaveModal
          message={savingMessage}
          onSave={handleSaveToKnowledge}
          onClose={handleCloseSaveModal}
        />
      )}
    </div>
  );
};

export default ChatTabBase;