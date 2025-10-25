// components/KnowledgeEditor.js - 完整修复版本
import { useState, useEffect } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

export default function KnowledgeEditor({ item, onClose }) {
  const { addKnowledge, updateKnowledge, categories, tags, addCategory, addTag } = useKnowledge();
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '技术',
    tags: '',
    source: 'manual'
  });
  
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 如果是编辑模式，填充表单数据
  useEffect(() => {
    if (item) {
      // 解析内容，如果是JSON格式则提取文本内容
      let contentText = item.content;
      try {
        const parsedContent = JSON.parse(item.content);
        if (Array.isArray(parsedContent) && parsedContent[0]?.content) {
          contentText = parsedContent.map(item => item.content).join('\n\n');
        }
      } catch (e) {
        // 保持原样，不是JSON格式
      }

      setFormData({
        title: item.title || '',
        content: contentText,
        category: item.category || '技术',
        tags: item.tags || '',
        source: item.source || 'manual'
      });
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      // 验证数据
      if (!formData.content.trim()) {
        throw new Error('内容不能为空');
      }

      if (formData.title.trim().length > 100) {
        throw new Error('标题不能超过100个字符');
      }

      // 处理新分类
      let finalCategory = formData.category;
      if (showNewCategory && newCategory.trim()) {
        if (newCategory.trim().length > 20) {
          throw new Error('分类名称不能超过20个字符');
        }
        await addCategory(newCategory.trim());
        finalCategory = newCategory.trim();
      }

      // 处理标签
      const finalTags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && tag.length > 0 && tag.length <= 20)
        .slice(0, 5)
        .join(',');

      // 在 KnowledgeEditor.js 的 handleSubmit 函数中，修改保存数据部分：

      // 构建保存数据 - 修复 title 字段问题
      const saveData = {
      // 如果标题为空字符串，不传递 title 字段或传递 undefined
         title: formData.title.trim() || undefined, // 使用 undefined 而不是 null
         content: JSON.stringify([{ 
         type: 'text', 
         content: formData.content.trim() 
         }]),
         category: finalCategory,
         tags: finalTags || '未分类',
         source: formData.source || 'manual'
};

      console.log('💾 保存知识点数据:', saveData);

      if (item) {
        // 更新现有知识点
        console.log('🔄 开始更新知识点...');
        await updateKnowledge(item.id, saveData);
        console.log('✅ 知识点更新完成');
      } else {
        // 添加新知识点
        console.log('🔄 开始添加知识点...');
        await addKnowledge(saveData);
        console.log('✅ 知识点添加完成');
      }
      
      // 保存成功后才关闭模态框
      onClose();
      
    } catch (error) {
      console.error('保存知识点失败:', error);
      // 提供更友好的错误信息
      let userFriendlyError = error.message;
      
      if (error.message.includes('数据库更新失败')) {
        userFriendlyError = '保存失败，请检查网络连接或稍后重试';
      } else if (error.message.includes('知识点不存在')) {
        userFriendlyError = '知识点不存在或已被删除';
      } else if (error.message.includes('无权')) {
        userFriendlyError = '您没有权限修改此知识点';
      } else if (error.message.includes('HTTP')) {
        userFriendlyError = '网络连接错误，请检查网络后重试';
      }
      
      setError(userFriendlyError || '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      try {
        await addCategory(newCategory.trim());
        setFormData(prev => ({ ...prev, category: newCategory.trim() }));
        setNewCategory('');
        setShowNewCategory(false);
      } catch (error) {
        setError('添加分类失败: ' + error.message);
      }
    }
  };

  const handleTagSelect = (tag) => {
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(', ');
      setFormData(prev => ({ ...prev, tags: newTags }));
    }
  };

  const handleAddTag = () => {
    if (newCategory.trim() && !tags.includes(newCategory.trim())) {
      addTag(newCategory.trim());
      handleTagSelect(newCategory.trim());
      setNewCategory('');
    }
  };

  // 键盘事件处理
  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {item ? '编辑知识点' : '新建知识点'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {item ? '修改知识点的内容和属性' : '添加新的知识点到知识库'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              title="关闭 (Esc)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 font-medium">错误</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标题
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="请输入知识点标题（可选）"
                maxLength={100}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 字符
              </div>
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                内容 *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
                placeholder="请输入知识点内容..."
                required
              />
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类
              </label>
              <div className="flex space-x-2">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
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
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
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
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim()}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                  >
                    添加
                  </button>
                </div>
              )}
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="用逗号分隔多个标签（如：React,JavaScript,前端）"
              />
              
              {tags.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">推荐标签:</div>
                  <div className="flex flex-wrap gap-1">
                    {tags.slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagSelect(tag)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 来源 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                来源
              </label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="manual">手动添加</option>
                <option value="chat">AI对话</option>
                <option value="import">导入</option>
              </select>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.content.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmitting ? '保存中...' : (item ? '更新知识点' : '保存知识点')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}