// components/EnhancedChat.js
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

// 消息组件 - 支持多选和单个操作
const MessageItem = ({ 
  message, 
  voiceEnabled, 
  onSpeak, 
  onSaveAsKnowledge,
  isSelected,
  onToggleSelect,
  showCheckbox 
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div 
      className={`mb-4 group relative ${message.type === 'user' ? 'text-right' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`inline-flex items-start max-w-xs md:max-w-md ${
        message.type === 'user' ? 'flex-row-reverse' : ''
      }`}>
        {/* 选择复选框 */}
        {showCheckbox && (
          <div className={`flex items-center mx-2 mt-2 ${
            message.type === 'user' ? 'order-2' : 'order-1'
          }`}>
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={() => onToggleSelect(message.id)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
        )}
        
        {/* 消息内容 */}
        <div className={`inline-block p-3 rounded-lg relative ${
          message.type === 'user' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        } ${showCheckbox ? message.type === 'user' ? 'mr-2' : 'ml-2' : ''}`}>
          <div className="break-words whitespace-pre-wrap">{message.content}</div>
          
          {/* AI消息的操作按钮 */}
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
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.784a1 1 0 011.617.784zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <button 
                onClick={() => onSaveAsKnowledge(message)}
                className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600 transition-colors shadow-sm"
                title="保存到知识库"
                disabled={message.saved}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-1 flex items-center justify-end space-x-2">
        <span>{message.time}</span>
        {message.saved && (
          <span className="text-green-600 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            已保存
          </span>
        )}
      </div>
    </div>
  );
};

// 批量保存模态框
const BatchSaveModal = ({ messages, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: '技术',
    tags: ''
  });

  useEffect(() => {
    if (messages.length > 0) {
      const firstMessage = messages[0].content;
      const autoTitle = messages.length === 1 
        ? (firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage)
        : `对话记录 (${messages.length}条消息)`;
      
      setFormData(prev => ({
        ...prev,
        title: autoTitle
      }));
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    onSave({
      ...formData,
      content: messages.map(msg => ({
        role: msg.type === 'user' ? '用户' : '助手',
        content: msg.content,
        time: msg.time
      })),
      source: '来自AI对话',
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!messages.length) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">批量保存到知识库</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-gray-50 p-3 rounded mb-4 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-700 mb-2">已选择 {messages.length} 条消息：</p>
            {messages.slice(0, 3).map((msg, index) => (
              <div key={index} className="text-xs text-gray-600 mb-1">
                {msg.type === 'user' ? '您' : '助手'}：{msg.content.substring(0, 50)}...
              </div>
            ))}
            {messages.length > 3 && <div className="text-xs text-gray-500">...还有{messages.length - 3}条</div>}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="技术">技术</option>
                  <option value="产品">产品</option>
                  <option value="设计">设计</option>
                  <option value="运营">运营</option>
                  <option value="市场">市场</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({...prev, tags: e.target.value}))}
                  placeholder="例如：React,前端,JavaScript"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                保存到知识库
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// 主组件
export default function EnhancedChat({ voiceEnabled, toggleVoice }) {
  const { addKnowledge } = useKnowledge();
  
  const [chatMessages, setChatMessages] = useState([
    { 
      type: 'ai', 
      content: '您好！我是您的AI助手。我可以帮助您管理项目、解答问题或提供创意建议。请问有什么可以帮您的？', 
      time: new Date().toLocaleTimeString(),
      saved: false,
      id: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [savingMessage, setSavingMessage] = useState(null);
  const [savingMessages, setSavingMessages] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [showCheckbox, setShowCheckbox] = useState(false);
  
  const speechSynthesisRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // 切换消息选择
  const toggleMessageSelection = useCallback((messageId) => {
    setSelectedMessages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(messageId)) {
        newSelection.delete(messageId);
      } else {
        newSelection.add(messageId);
      }
      return newSelection;
    });
  }, []);

  // 语音播报
  const speakText = useCallback((text) => {
    if (!voiceEnabled || !speechSynthesisRef.current) return;
    speechSynthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    speechSynthesisRef.current.speak(utterance);
  }, [voiceEnabled]);

  // 单个消息保存
  const handleSaveAsKnowledge = useCallback((message) => {
    setSavingMessage(message);
  }, []);

  // 批量保存
  const handleBatchSave = useCallback(() => {
    const selected = chatMessages.filter(msg => selectedMessages.has(msg.id));
    setSavingMessages(selected);
  }, [chatMessages, selectedMessages]);

  // 保存知识点
  const handleKnowledgeSave = useCallback((knowledgeData) => {
    addKnowledge(knowledgeData);
    
    // 更新消息的保存状态
    setChatMessages(prev => prev.map(msg => {
      if (savingMessage && msg.id === savingMessage.id) {
        return { ...msg, saved: true };
      }
      if (savingMessages && savingMessages.some(sm => sm.id === msg.id)) {
        return { ...msg, saved: true };
      }
      return msg;
    }));
    
    setSavingMessage(null);
    setSavingMessages(null);
    setSelectedMessages(new Set());
  }, [addKnowledge, savingMessage, savingMessages]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isSending) return;
    
    const userMessage = {
      type: 'user',
      content: chatInput.trim(),
      time: new Date().toLocaleTimeString(),
      saved: false,
      id: Date.now()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);
    setConnectionStatus('connecting');
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API请求失败: ${response.status}`);
      }

      const data = await response.json();

      const aiMessage = {
        type: 'ai',
        content: data.response,
        time: new Date().toLocaleTimeString(),
        saved: false,
        id: Date.now() + 1
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      setConnectionStatus('connected');
      speakText(data.response);
      
    } catch (error) {
      console.error('发送消息错误:', error);
      
      let errorContent = `抱歉，处理您的请求时出现了问题：${error.message}`;
      
      if (error.message.includes('Unauthorized')) {
        errorContent = '请先登录后再使用聊天功能。';
      } else if (error.message.includes('Message too long')) {
        errorContent = '消息过长，请缩短至1000字符以内。';
      } else if (error.message.includes('AI service error')) {
        errorContent = 'AI服务暂时不可用，请稍后重试。';
      }
      
      const errorMessage = {
        type: 'ai',
        content: errorContent,
        time: new Date().toLocaleTimeString(),
        saved: false,
        id: Date.now() + 1
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      setConnectionStatus('error');
    } finally {
      setIsSending(false);
    }
  }, [chatInput, isSending, speakText]);

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
      time: new Date().toLocaleTimeString(),
      saved: false,
      id: Date.now()
    }]);
    setSelectedMessages(new Set());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setShowCheckbox(prev => !prev);
    setSelectedMessages(new Set());
  }, []);

  // 连接状态指示器
  const ConnectionIndicator = () => {
    const statusConfig = {
      connected: { color: 'text-green-500', text: '已连接' },
      connecting: { color: 'text-yellow-500', text: '思考中...' },
      error: { color: 'text-red-500', text: '连接错误' }
    };
    
    const config = statusConfig[connectionStatus] || statusConfig.connected;
    
    return (
      <div className={`flex items-center text-sm ${config.color}`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${config.color.replace('text', 'bg')}`}></div>
        {config.text}
      </div>
    );
  };

  // 使用useMemo优化消息渲染
  const messageElements = useMemo(() => 
    chatMessages.map((message) => (
      <MessageItem 
        key={message.id}
        message={message} 
        voiceEnabled={voiceEnabled} 
        onSpeak={speakText}
        onSaveAsKnowledge={handleSaveAsKnowledge}
        isSelected={selectedMessages.has(message.id)}
        onToggleSelect={toggleMessageSelection}
        showCheckbox={showCheckbox}
      />
    )),
  [chatMessages, voiceEnabled, speakText, handleSaveAsKnowledge, selectedMessages, toggleMessageSelection, showCheckbox]);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 py-5 sm:p-6 flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">AI助手对话</h3>
          <div className="flex items-center space-x-4">
            <ConnectionIndicator />
            <button
              onClick={toggleSelectionMode}
              className={`text-sm transition-colors ${
                showCheckbox ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}
              title={showCheckbox ? '退出选择模式' : '进入选择模式'}
            >
              {showCheckbox ? '退出选择' : '选择消息'}
            </button>
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
        
        {/* 批量操作工具栏 */}
        {showCheckbox && selectedMessages.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex justify-between items-center">
            <span className="text-blue-700">已选择 {selectedMessages.size} 条消息</span>
            <div className="flex space-x-2">
              <button 
                onClick={handleBatchSave}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                批量保存
              </button>
              <button 
                onClick={() => setSelectedMessages(new Set())}
                className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 transition-colors"
              >
                取消选择
              </button>
            </div>
          </div>
        )}
        
        {/* 消息列表 */}
        <div className="border rounded-lg flex-1 overflow-y-auto p-4 mb-4 bg-gray-50">
          <div className="min-h-full">
            {messageElements}
            {isSending && (
              <div className="mb-4">
                <div className="inline-block p-3 rounded-lg bg-gray-100 text-gray-800">
                  <div className="flex items-center">
                    <div className="animate-pulse mr-2">思考中</div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* 输入区域 */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题或需求..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSending}
            maxLength={500}
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending || !chatInput.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSending ? '思考中...' : '发送'}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-green-500">
          ✓ 已连接真实AI服务 • 支持批量保存知识点
        </div>
      </div>

      {/* 单个保存模态框 */}
      {savingMessage && (
        <BatchSaveModal
          messages={[savingMessage]}
          onSave={handleKnowledgeSave}
          onClose={() => setSavingMessage(null)}
        />
      )}

      {/* 批量保存模态框 */}
      {savingMessages && (
        <BatchSaveModal
          messages={savingMessages}
          onSave={handleKnowledgeSave}
          onClose={() => setSavingMessages(null)}
        />
      )}
    </div>
  );
}