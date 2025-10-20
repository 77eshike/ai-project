// src/components/chat/ChatTabBase.js - 修复版本（添加指令识别和项目功能）
import { useState, useRef, useCallback, useEffect } from 'react';
import KnowledgeSaveModal from './KnowledgeSaveModal';

const ChatTabBase = ({ 
  user, 
  voiceEnabled, 
  toggleVoice, 
  className, 
  isMobile = false,
  onSendMessageReady,
  platformProps = {}
}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savingMessage, setSavingMessage] = useState(null);
  const [toast, setToast] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  // 显示 toast 提示
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 保存知识点到后端 - 修复版本
  const handleSaveKnowledge = useCallback(async (knowledgeData) => {
    try {
      console.log('💾 保存知识点:', knowledgeData);
      
      const saveData = {
        content: [
          {
            type: 'text',
            content: knowledgeData.content
          }
        ],
        category: knowledgeData.category,
        tags: knowledgeData.tags,
        source: knowledgeData.source || 'chat'
      };

      console.log('📤 发送保存请求:', saveData);

      const response = await fetch('/api/knowledge/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(saveData)
      });

      const data = await response.json();
      console.log('📨 保存响应:', data);

      if (!response.ok) {
        const errorMessage = data.error || data.message || `保存失败: ${response.status}`;
        console.error('保存知识点响应错误:', errorMessage);
        throw new Error(errorMessage);
      }

      if (data.success) {
        console.log('✅ 知识点保存成功', data);
        showToast('知识点保存成功', 'success');
      } else {
        throw new Error(data.error || '保存失败');
      }
      
      return data;
    } catch (error) {
      console.error('❌ 保存知识点失败:', error);
      showToast(`保存失败: ${error.message}`, 'error');
      throw error;
    }
  }, [showToast]);

  // 处理保存知识点
  const handleSaveMessage = useCallback((message) => {
    setSavingMessage(message);
  }, []);

  // 关闭保存模态框
  const handleCloseSaveModal = useCallback(() => {
    setSavingMessage(null);
  }, []);

  // 清理文本用于语音播报 - 移除符号
  const cleanTextForSpeech = useCallback((text) => {
    if (!text) return '';
    
    // 使用平台提供的清理函数，或者使用默认的
    if (platformProps.cleanTextForSpeech) {
      return platformProps.cleanTextForSpeech(text);
    }
    
    // 默认的符号清理逻辑
    return text
      .replace(/[”“"「」『』《》【】（）(){}<>]/g, ' ') // 中文括号和引号
      .replace(/[.,~?!，。？！、；：]/g, ' ') // 标点符号
      .replace(/\*|#|-|_|~|`|\||\\/g, ' ') // 其他符号
      .replace(/\s+/g, ' ') // 多个空格合并为一个
      .trim();
  }, [platformProps.cleanTextForSpeech]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 处理指令响应
  const handleCommandResponse = useCallback((commandResult) => {
    switch (commandResult.command) {
      case 'save_to_knowledge':
        if (commandResult.success) {
          showToast(`✅ 已保存到知识库 - ${commandResult.data.category}`, 'success');
        } else {
          showToast('❌ 保存到知识库失败', 'error');
        }
        break;
        
      case 'generate_draft_project':
        if (commandResult.success) {
          showToast(`🎯 已生成待定项目: ${commandResult.data.title}`, 'success');
          // 可以在这里提供项目链接或导航
        } else {
          showToast('❌ 生成项目失败', 'error');
        }
        break;
        
      case 'toggle_voice':
        // 语音开关已经在响应中处理了
        break;
        
      case 'organize_knowledge':
        if (commandResult.success) {
          showToast(`📚 已整理知识库，重新分类了 ${commandResult.data.reorganizedCount} 条内容`, 'success');
        } else {
          showToast('❌ 整理知识库失败', 'error');
        }
        break;
        
      default:
        // 其他指令
        if (commandResult.success) {
          showToast(`✅ ${commandResult.message}`, 'success');
        } else {
          showToast(`❌ ${commandResult.message}`, 'error');
        }
    }
  }, [showToast]);

  // 发送消息到AI API - 修复版本（支持指令识别）
  const handleSendMessage = useCallback(async (text = null) => {
    const messageContent = String(text || inputText || '').trim();
    if (!messageContent || isLoading) return;

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
    
    // 清空输入框（如果不是语音输入）
    if (!text) setInputText('');

    try {
      console.log('🤖 发送消息到AI API:', {
        message: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
        conversationId: currentConversationId,
        voiceEnabled: voiceEnabled
      });

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: messageContent,
          conversationId: currentConversationId,
          mode: 'general',
          voiceEnabled: voiceEnabled
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(data.error || '认证失败，请重新登录');
        }
        if (response.status === 404) {
          throw new Error(data.error || 'API端点不存在，请联系管理员');
        }
        if (response.status === 429) {
          throw new Error(data.error || '请求过于频繁，请稍后重试');
        }
        throw new Error(data.error || `API请求失败: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'AI服务暂时不可用');
      }

      // 更新对话ID
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }

      // === 新增：处理指令响应 ===
      let aiMessage;
      if (data.isCommand) {
        // 指令响应消息
        aiMessage = {
          id: Date.now() + 1,
          type: 'command',
          content: data.response || data.reply,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          commandData: data.commandResult
        };
        
        // 处理指令的额外操作
        handleCommandResponse(data.commandResult);
      } else {
        // 普通AI回复消息
        aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.response || data.reply || '抱歉，我暂时无法回复。',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        };
      }

      setMessages(prev => [...prev, aiMessage]);

      // 如果启用了语音播报，且不是指令响应，调用TTS
      if (voiceEnabled && !data.isCommand && (data.response || data.reply)) {
        const textToSpeak = data.response || data.reply;
        console.log('🔊 准备语音播报:', textToSpeak.substring(0, 50) + '...');
        
        if (platformProps.speakText) {
          platformProps.speakText(textToSpeak);
        } else {
          speakMessage(textToSpeak);
        }
      }

      console.log('✅ AI回复成功', {
        responseLength: (data.response || data.reply).length,
        conversationId: data.conversationId,
        isCommand: data.isCommand
      });

    } catch (error) {
      console.error('❌ AI对话失败:', error);
      
      // 添加错误消息
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
  }, [inputText, isLoading, user, voiceEnabled, currentConversationId, platformProps, handleCommandResponse]);

  // 文本转语音功能 - 添加符号过滤
  const speakMessage = useCallback((text) => {
    if (!voiceEnabled || !text) return;

    try {
      if ('speechSynthesis' in window) {
        // 停止之前的语音
        stopSpeech();
        
        // 清理文本，移除符号
        const cleanText = cleanTextForSpeech(text);
        console.log('🔊 清理后的语音文本:', cleanText.substring(0, 50) + '...');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // 语音开始事件
        utterance.onstart = () => {
          console.log('🔊 语音播报开始');
          setIsSpeaking(true);
        };
        
        // 语音结束事件
        utterance.onend = () => {
          console.log('🔊 语音播报结束');
          setIsSpeaking(false);
        };
        
        // 语音错误事件
        utterance.onerror = (event) => {
          console.warn('语音播报错误:', event);
          setIsSpeaking(false);
        };
        
        // 播放新语音
        window.speechSynthesis.speak(utterance);
        speechSynthesisRef.current = utterance;
        
      } else {
        console.warn('浏览器不支持语音合成');
      }
    } catch (ttsError) {
      console.warn('语音播报失败:', ttsError);
      setIsSpeaking(false);
    }
  }, [voiceEnabled, cleanTextForSpeech]);

  // 停止语音播报
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // 切换语音播报状态
  const handleVoiceToggle = useCallback((enabled) => {
    if (!enabled) {
      stopSpeech();
    }
    toggleVoice(enabled);
  }, [toggleVoice, stopSpeech]);

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

  // 清除错误
  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  // 清除对话
  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    stopSpeech();
  }, [stopSpeech]);

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
      stopSpeech();
    };
  }, [stopSpeech]);

  // 渲染指令消息的特殊内容
  const renderCommandMessage = useCallback((message) => {
    const { commandData } = message;
    
    if (!commandData) return null;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
            <span className="text-white text-xs">✓</span>
          </div>
          <span className="text-green-800 font-medium text-sm">指令执行完成</span>
        </div>
        
        {commandData.command === 'generate_draft_project' && commandData.data && (
          <div className="bg-white rounded border p-2 mb-2">
            <h4 className="font-medium text-gray-900 text-sm mb-1">项目信息</h4>
            <p className="text-xs text-gray-600 mb-2">{commandData.data.title}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(commandData.data.projectId);
                showToast('项目ID已复制到剪贴板', 'success');
              }}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
            >
              复制项目ID
            </button>
          </div>
        )}
        
        {commandData.command === 'save_to_knowledge' && commandData.data && (
          <div className="bg-white rounded border p-2">
            <h4 className="font-medium text-gray-900 text-sm mb-1">知识库信息</h4>
            <p className="text-xs text-gray-600">分类: {commandData.data.category}</p>
          </div>
        )}
      </div>
    );
  }, [showToast]);

  // 渲染消息操作按钮
  const renderMessageActions = useCallback((message) => {
    if (message.type !== 'ai') return null;

    return (
      <div className={`flex ${isMobile ? 'justify-center mt-2' : 'justify-end mt-1'}`}>
        <button
          onClick={() => handleSaveMessage(message)}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          title="保存到知识点"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span>保存</span>
        </button>
      </div>
    );
  }, [isMobile, handleSaveMessage]);

  const isSendDisabled = !inputText.trim() || isLoading;

  // 快捷提示消息 - 添加指令提示
  const quickSuggestions = [
    { text: '你好，请介绍一下你自己', emoji: '👋' },
    { text: '你能帮我做什么？', emoji: '❓' },
    { text: '把这个对话转入知识库', emoji: '💾', isCommand: true },
    { text: '生成待定项目', emoji: '🚀', isCommand: true },
    { text: '写一个简单的JavaScript函数', emoji: '💻' },
    { text: '推荐一些学习资源', emoji: '📚' }
  ];

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
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
            <p className="text-xs text-gray-600">支持指令识别和项目生成</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* 清空对话按钮 */}
          {messages.length > 0 && (
            <button
              onClick={handleClearConversation}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              title="清空对话"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          
          {/* 语音控制 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 hidden sm:block">语音播报</span>
            <button
              onClick={() => handleVoiceToggle(!voiceEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              title={voiceEnabled ? '关闭语音播报' : '开启语音播报'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                } ${isSpeaking ? 'animate-pulse' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 平台特定UI */}
      {platformProps.platformUI && (
        <div className="px-4 pt-4">
          {platformProps.platformUI}
        </div>
      )}

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
            </div>
            <button
              onClick={handleClearError}
              className="text-red-500 hover:text-red-700 ml-2 transition-colors"
              title="关闭错误提示"
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
              支持智能指令识别，试试说：
              <span className="block text-blue-600 font-medium mt-2">
                "转入知识库" 或 "生成待定项目"
              </span>
            </p>
            
            {/* 快捷提示 */}
            <div className="w-full max-w-md">
              <div className="grid gap-2">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputText(suggestion.text)}
                    className={`text-sm text-gray-700 bg-white hover:bg-gray-50 px-4 py-3 rounded-lg border transition-all duration-200 text-left hover:shadow-sm ${
                      suggestion.isCommand 
                        ? 'hover:border-green-300 border-green-200 bg-green-50' 
                        : 'hover:border-blue-200'
                    }`}
                  >
                    <span className="mr-2">{suggestion.emoji}</span>
                    {suggestion.text}
                    {suggestion.isCommand && (
                      <span className="ml-2 text-xs text-green-600 bg-green-100 px-1 rounded">指令</span>
                    )}
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
                {/* 头像 */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                    : message.type === 'ai'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600'
                    : message.type === 'command'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-orange-500 to-red-600'
                }`}>
                  <span className="text-white text-xs font-bold">
                    {message.type === 'user' ? '您' : 
                     message.type === 'ai' ? 'AI' : 
                     message.type === 'command' ? '✓' : '!'}
                  </span>
                </div>

                {/* 消息内容 */}
                <div className={`max-w-[85%] ${isMobile ? 'max-w-[75%]' : ''} ${
                  message.type === 'user' ? 'text-right' : ''
                }`}>
                  <div
                    className={`inline-block px-4 py-3 rounded-2xl ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : message.type === 'ai'
                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                        : message.type === 'command'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-orange-50 text-orange-800 border border-orange-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* 指令消息的特殊内容 */}
                    {message.type === 'command' && renderCommandMessage(message)}
                  </div>
                  
                  {/* 保存按钮 - 仅AI消息显示 */}
                  {renderMessageActions(message)}
                  
                  <div className={`text-xs text-gray-500 mt-2 ${
                    message.type === 'user' ? 'text-right' : ''
                  }`}>
                    {message.time}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 加载指示器 */}
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
                    <span className="text-sm font-medium">AI正在思考...</span>
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
          {/* 文本输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isMobile ? "输入消息..." : "输入您的问题或指令...（Enter发送，Shift+Enter换行）"}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all bg-white"
              rows="1"
              disabled={isLoading}
              style={{
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />
            {/* 输入提示 */}
            <div className="absolute bottom-2 right-3 text-xs text-gray-400 bg-white px-1 rounded">
              {inputText.length}/1000
            </div>
          </div>

          {/* 发送按钮 */}
          <button
            onClick={() => handleSendMessage()}
            disabled={isSendDisabled}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center min-w-[80px] justify-center font-medium shadow-sm hover:shadow-md disabled:shadow-none"
            title={isSendDisabled ? '请输入消息' : '发送消息'}
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
        
        {/* 指令提示 */}
        <div className="mt-2 text-xs text-gray-500">
          试试说：<span className="text-blue-600">"转入知识库"</span>、<span className="text-blue-600">"生成待定项目"</span>
        </div>
      </div>

      {/* 知识点保存模态框 */}
      {savingMessage && (
        <KnowledgeSaveModal
          message={savingMessage}
          onSave={handleSaveKnowledge}
          onClose={handleCloseSaveModal}
        />
      )}
    </div>
  );
};

// 添加CSS动画
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-fadeInUp {
  animation: fadeInUp 0.4s ease-out;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default ChatTabBase;