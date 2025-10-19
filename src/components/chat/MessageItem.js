// src/components/chat/MessageItem.js - 增强版本
import { useCallback, useState } from 'react';

const MessageItem = ({ message, voiceEnabled, onSpeak, onSaveAsKnowledge, isMobile = false }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    if (voiceEnabled && !isMobile && onSpeak) {
      setIsSpeaking(true);
      onSpeak(message.content);
      
      // 模拟语音播报结束
      setTimeout(() => {
        setIsSpeaking(false);
      }, message.content.length * 100); // 根据文本长度估算时间
    }
  }, [voiceEnabled, onSpeak, message.content, isMobile]);

  const handleSave = useCallback(() => {
    if (onSaveAsKnowledge) {
      onSaveAsKnowledge(message);
    }
  }, [onSaveAsKnowledge, message]);

  // 格式化消息内容，支持简单的Markdown样式
  const formatContent = (content) => {
    if (!content) return '';
    
    // 简单的URL检测和格式化
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const formattedContent = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');
    
    // 代码块格式化
    const codeBlockRegex = /`([^`]+)`/g;
    const finalContent = formattedContent.replace(codeBlockRegex, '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm">$1</code>');
    
    return finalContent;
  };

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs sm:max-w-md lg:max-w-2xl rounded-lg p-3 sm:p-4 relative group ${
        message.type === 'user' 
          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
          : message.isError 
          ? 'bg-red-100 text-red-800 border border-red-200' 
          : 'bg-gray-100 text-gray-800 border border-gray-200'
      } ${isSpeaking ? 'ring-2 ring-blue-400' : ''}`}>
        
        {/* 消息头像 */}
        <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
          message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
        }`}>
          {message.type === 'user' ? '👤' : '🤖'}
        </div>

        {/* 消息内容 */}
        <div 
          className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        
        {/* 消息底部信息 */}
        <div className="text-xs text-gray-500 mt-2 flex justify-between items-center">
          <span>{message.time}</span>
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.type === 'ai' && voiceEnabled && !message.isError && !isMobile && (
              <button 
                onClick={handleSpeak}
                disabled={isSpeaking}
                className={`transition-colors ${
                  isSpeaking 
                    ? 'text-blue-700 cursor-not-allowed' 
                    : 'text-blue-500 hover:text-blue-700'
                }`}
                title={isSpeaking ? "播放中..." : "播放语音"}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {isSpeaking ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.728-2.728" />
                  )}
                </svg>
              </button>
            )}
            {!message.saved && message.type === 'ai' && !message.isError && (
              <button 
                onClick={handleSave}
                className="text-green-500 hover:text-green-700 transition-colors"
                title="保存为知识点"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            {message.saved && (
              <span className="text-green-500 text-xs flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                已保存
              </span>
            )}
          </div>
        </div>

        {/* 错误消息的特殊处理 */}
        {message.isError && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;