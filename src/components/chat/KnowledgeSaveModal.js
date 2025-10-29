// src/components/chat/KnowledgeSaveModal.js - 完全修复版本
import { useState, useCallback, useEffect } from 'react';
import { useKnowledge } from '../../contexts/KnowledgeContext';

const KnowledgeSaveModal = ({ message, onSave, onClose }) => {
  const { categories, tags, addCategory, addTag } = useKnowledge();
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || '技术');
  const [inputTags, setInputTags] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  // 1. 首先定义所有工具函数（不依赖其他函数）
  const extractSmartTags = useCallback((content) => {
    if (!content) return [];
    
    try {
      let text = content;
      
      if (typeof content === 'string' && content.startsWith('[') && content.endsWith(']')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed[0]?.content) {
            text = parsed.map(item => item.content || '').join(' ');
          }
        } catch (e) {
          // 解析失败，保持原样
        }
      }
      
      const cleanText = text
        .replace(/[#*`\[\](){}【】《》""'']/g, '')
        .replace(/\n/g, ' ')
        .toLowerCase()
        .trim();
      
      if (!cleanText) return ['AI对话', '帮助文档'];
      
      const stopWords = new Set([
        '这个', '那个', '什么', '怎么', '如何', '为什么', '可以', '应该', '需要',
        '问题', '帮助', '一下', '一些', '一种', '一个', '我们', '你们', '他们'
      ]);
      
      const words = cleanText
        .split(/[\s,，.。!！?？;；:：、]+/)
        .filter(word => 
          word && 
          word.length >= 2 && 
          word.length <= 6 && 
          !stopWords.has(word) &&
          !/\d/.test(word)
        );
      
      if (words.length === 0) return ['AI对话', '帮助文档'];
      
      const wordFreq = {};
      words.forEach(word => {
        if (word) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
      
      const sortedTags = Object.keys(wordFreq)
        .sort((a, b) => wordFreq[b] - wordFreq[a])
        .slice(0, 3);
      
      return sortedTags.length > 0 ? sortedTags : ['AI对话', '帮助文档'];
        
    } catch (error) {
      console.error('提取标签失败:', error);
      return ['AI对话', '帮助文档'];
    }
  }, []);

  const generateTitle = useCallback((content) => {
    if (!content) return '新知识点';
    
    try {
      let text = content;
      
      if (typeof content === 'string' && content.startsWith('[') && content.endsWith(']')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed[0]?.content) {
            text = parsed.map(item => item.content || '').join(' ');
          }
        } catch (e) {
          // 解析失败，保持原样
        }
      }
      
      if (!text) return '新知识点';
      
      const cleanText = text
        .replace(/[#*`\[\](){}【】《》""'']/g, '')
        .replace(/\n/g, ' ')
        .trim();
      
      if (!cleanText) return '新知识点';
      
      const firstLine = cleanText.split(/[.!?。！？]/)[0] || cleanText;
      let title = firstLine.substring(0, 50).trim();
      
      if (title.length === 0) {
        title = '未命名知识点';
      } else if (title.length === 50) {
        title += '...';
      }
      
      return title;
    } catch (error) {
      console.error('生成标题失败:', error);
      return '新知识点';
    }
  }, []);

  // 2. 定义 handleAddCategory（不依赖 handleSave）
  const handleAddCategory = useCallback(async () => {
    if (newCategory.trim()) {
      try {
        await addCategory(newCategory.trim());
        setSelectedCategory(newCategory.trim());
        setNewCategory('');
        setShowNewCategory(false);
      } catch (error) {
        setError('添加分类失败: ' + error.message);
      }
    }
  }, [newCategory, addCategory]);

  // 3. 定义 handleSave（现在可以安全定义，不会被其他函数提前引用）
  const handleSave = useCallback(async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      // 验证标题
      if (!customTitle?.trim()) {
        throw new Error('请输入标题');
      }
      
      if (customTitle.trim().length > 100) {
        throw new Error('标题不能超过100个字符');
      }

      // 处理新分类
      let finalCategory = selectedCategory;
      if (showNewCategory && newCategory.trim()) {
        if (newCategory.trim().length > 20) {
          throw new Error('分类名称不能超过20个字符');
        }
        await addCategory(newCategory.trim());
        finalCategory = newCategory.trim();
      }
      
      // 处理标签
      const finalTags = inputTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && tag.length > 0 && tag.length <= 20)
        .slice(0, 5);
      
      // 确保有默认标签
      if (finalTags.length === 0) {
        finalTags.push('AI对话', '帮助文档');
      }

      const tagsString = finalTags.join(',');
      
      // 构建保存数据
      const knowledgeData = {
        title: customTitle.trim(),
        content: message?.content || '',
        category: finalCategory || '技术',
        tags: tagsString,
        source: 'chat'
      };
      
      console.log('💾 保存知识点数据:', knowledgeData);
      await onSave(knowledgeData);
      
      onClose();
    } catch (error) {
      console.error('保存知识点失败:', error);
      setError(error.message || '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    message, 
    customTitle, 
    selectedCategory, 
    inputTags, 
    newCategory, 
    showNewCategory, 
    onSave, 
    addCategory, 
    onClose
  ]);

  // 4. 现在可以安全定义依赖 handleSave 的函数
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSave, onClose]);

  // 5. useEffect 放在最后
  useEffect(() => {
    if (message?.content) {
      if (!customTitle) {
        const generatedTitle = generateTitle(message.content);
        setCustomTitle(generatedTitle || '新知识点');
      }
      
      if (!inputTags) {
        const suggestedTags = extractSmartTags(message.content);
        if (suggestedTags && Array.isArray(suggestedTags) && suggestedTags.length > 0) {
          setInputTags(suggestedTags.join(', '));
        } else {
          setInputTags('AI对话,帮助文档');
        }
      }
    }
  }, [message?.content, customTitle, inputTags, generateTitle, extractSmartTags]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // 渲染部分
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">保存知识点</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题 *
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入知识点标题"
              maxLength={100}
            />
            <div className="text-xs text-gray-500 mt-1">
              {customTitle?.length || 0}/100 字符
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分类
            </label>
            <div className="flex space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={showNewCategory}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                {showNewCategory ? '选择现有' : '新建分类'}
              </button>
            </div>
            
            {showNewCategory && (
              <div className="mt-2 flex space-x-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="输入新分类名称"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-sm"
                >
                  添加
                </button>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <input
              type="text"
              value={inputTags}
              onChange={(e) => setInputTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="用逗号分隔多个标签（如：React,JavaScript,前端）"
            />
            <div className="text-xs text-gray-500 mt-1">自动提取的标签，可修改</div>
            
            {tags.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">推荐标签:</div>
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = inputTags.split(',').map(t => t.trim()).filter(t => t);
                        if (!currentTags.includes(tag)) {
                          setInputTags([...currentTags, tag].join(', '));
                        }
                      }}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容预览
            </label>
            <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-600 max-h-32 overflow-y-auto border border-gray-200">
              {message?.content || '无内容'}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || !customTitle?.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? '保存中...' : '保存知识点'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeSaveModal;