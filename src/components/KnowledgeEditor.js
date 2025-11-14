// components/KnowledgeEditor.js - 修复导入路径
import { useState, useEffect } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';
import { 
  parseKnowledgeContent, 
  formatKnowledgeContent,
  generateKnowledgeTitle,
  validateKnowledgeData 
} from './Utils/knowledgeUtils'; // 🔧 修正：Utils 首字母大写

export default function KnowledgeEditor({ item, onSave, onClose }) {
  const { addKnowledge, updateKnowledge, categories = [], tags = [], addCategory, addTag } = useKnowledge();
  
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
  const [success, setSuccess] = useState('');

  // 🔧 关键修复：使用统一的内容解析
  useEffect(() => {
    if (item) {
      // 编辑模式：使用统一的内容解析
      const contentText = parseKnowledgeContent(item.content);
      
      setFormData({
        title: item.title || '',
        content: contentText,
        category: item.category || '技术',
        tags: item.tags || '',
        source: item.source || 'manual'
      });
    } else {
      // 新建模式：重置表单
      setFormData({
        title: '',
        content: '',
        category: '技术',
        tags: '',
        source: 'manual'
      });
    }
    setError('');
    setSuccess('');
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // 使用统一的验证
      const validationErrors = validateKnowledgeData(formData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // 处理新分类
      let finalCategory = formData.category;
      if (showNewCategory && newCategory.trim()) {
        if (newCategory.trim().length > 20) {
          throw new Error('分类名称不能超过20个字符');
        }
        if (addCategory) {
          await addCategory(newCategory.trim());
        }
        finalCategory = newCategory.trim();
      }

      // 处理标签
      const finalTags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && tag.length > 0 && tag.length <= 20)
        .slice(0, 10)
        .join(',');

      // 🔧 关键修复：使用统一的内容格式化
      const saveData = {
        title: formData.title.trim() || generateKnowledgeTitle(formData.content),
        content: formatKnowledgeContent(formData.content),
        category: finalCategory,
        tags: finalTags || '未分类',
        source: formData.source || 'manual'
      };

      console.log('💾 保存知识点数据:', {
        模式: item ? '编辑' : '新建',
        原始内容: formData.content,
        格式化内容: saveData.content,
        标题: saveData.title
      });

      let result;
      if (item && item.id) {
        // 更新现有知识点
        result = await updateKnowledge(item.id, saveData);
        setSuccess('知识点更新成功！');
      } else {
        // 添加新知识点
        result = await addKnowledge(saveData);
        setSuccess('知识点创建成功！');
      }
      
      // 保存成功后延迟关闭模态框
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1500);
      
    } catch (error) {
      console.error('保存知识点失败:', error);
      setError(error.message || '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      try {
        if (addCategory) {
          await addCategory(newCategory.trim());
        }
        setFormData(prev => ({ ...prev, category: newCategory.trim() }));
        setNewCategory('');
        setShowNewCategory(false);
        setSuccess(`分类 "${newCategory.trim()}" 添加成功！`);
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

  // 快速插入模板
  const insertTemplate = (templateType) => {
    const templates = {
      meeting: `会议记录模板：
📅 会议主题：
👥 参会人员：
📝 会议内容：
✅ 决议事项：
➡️ 下一步计划：`,

      code: `代码片段模板：
// 功能描述：
// 使用场景：
// 示例：

function example() {
  // 代码实现
}`,

      note: `学习笔记模板：
📚 主题：
🎯 重点内容：
💡 关键理解：
🔗 相关链接：
📝 个人总结：`,

      task: `任务记录模板：
✅ 任务名称：
📋 任务描述：
🔧 使用工具：
⏰ 耗时统计：
💭 经验总结：`,

      idea: `想法记录模板：
💡 核心想法：
🎯 应用场景：
🔧 实现思路：
📈 潜在价值：
🤔 待解决问题：`
    };

    const template = templates[templateType] || '';
    setFormData(prev => ({
      ...prev,
      content: prev.content + (prev.content ? '\n\n' : '') + template
    }));
  };

  // 键盘事件处理
  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      if (onClose) onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 's' && e.ctrlKey) {
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

  // 自动聚焦到内容区域
  useEffect(() => {
    if (!item) { // 只在新建时自动聚焦
      const contentTextarea = document.querySelector('textarea[name="content"]');
      if (contentTextarea) {
        setTimeout(() => {
          contentTextarea.focus();
        }, 100);
      }
    }
  }, [item]);

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
                {item ? `正在编辑: ${item.title || '未命名知识点'}` : '添加新的知识点到知识库'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              title="关闭 (Esc)"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 成功消息 */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">成功</span>
              </div>
              <p className="text-green-700 text-sm mt-1">{success}</p>
            </div>
          )}
          
          {/* 错误消息 */}
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
                标题 <span className="text-gray-400 text-xs">(可选)</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="请输入知识点标题，留空将使用内容前50个字符作为标题"
                maxLength={100}
              />
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>{formData.title.length}/100 字符</span>
                <span>建议长度：2-30个字符</span>
              </div>
            </div>

            {/* 内容 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  内容 <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <span className="text-xs text-gray-500">快速模板：</span>
                  <button
                    type="button"
                    onClick={() => insertTemplate('meeting')}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    会议记录
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate('code')}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                  >
                    代码片段
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate('note')}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                  >
                    学习笔记
                  </button>
                </div>
              </div>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical font-mono text-sm"
                placeholder="请输入知识点内容...（支持 Markdown 格式）"
                required
              />
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>{formData.content.length} 字符</span>
                <span>支持 Markdown 语法</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 分类 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <div className="space-y-2">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={showNewCategory}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(!showNewCategory)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      {showNewCategory ? '选择现有分类' : '创建新分类'}
                    </button>
                  </div>
                  
                  {showNewCategory && (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                        placeholder="输入新分类名称"
                        maxLength={20}
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={!newCategory.trim()}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-sm"
                      >
                        添加
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签 <span className="text-gray-400 text-xs">(用逗号分隔)</span>
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="例如：React,JavaScript,前端开发"
                />
                
                {tags && tags.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">常用标签:</div>
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 8).map(tag => (
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
                <option value="web">网页采集</option>
                <option value="document">文档解析</option>
              </select>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                快捷键: Ctrl+S 保存 • Ctrl+Enter 保存 • Esc 取消
              </div>
              <div className="flex space-x-3">
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
                  {isSubmitting ? '保存中...' : (item ? '更新知识点' : '创建知识点')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}