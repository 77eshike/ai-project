// src/components/KnowledgeDetail.js - 统一布局版本
import { useState, useEffect } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';
import { parseKnowledgeContent, formatKnowledgeContent } from './Utils/knowledgeUtils';

export default function KnowledgeDetail({ item, onClose, onEdit }) {
  const { updateKnowledge } = useKnowledge();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '技术',
    tags: '',
    source: 'manual'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 使用统一的内容解析
  const displayContent = parseKnowledgeContent(item?.content);

  // 安全日期格式化
  const formatDate = (dateString) => {
    if (!dateString) return '未知日期';
    try {
      return new Date(dateString).toLocaleString('zh-CN');
    } catch (e) {
      return '未知日期';
    }
  };

  // 初始化表单数据
  useEffect(() => {
    if (item) {
      const contentText = parseKnowledgeContent(item.content);
      
      setFormData({
        title: item.title || '',
        content: contentText,
        category: item.category || '技术',
        tags: item.tags || '',
        source: item.source || 'manual'
      });
    }
  }, [item]);

  // 统一的编辑处理
  const handleEditClick = () => {
    console.log('✏️ 从详情模态框点击编辑:', {
      原始数据: item,
      解析内容: displayContent
    });
    
    if (onEdit) {
      // 传递原始 item 对象，确保与卡片编辑一致
      onEdit(item);
      onClose(); // 关闭详情模态框，让父组件打开编辑模态框
    } else {
      // 备用方案：直接在详情模态框中进入编辑模式
      setIsEditing(true);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.content.trim()) {
      setError('内容不能为空');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // 使用统一的内容格式化
      await updateKnowledge(item.id, {
        ...item,
        title: formData.title.trim() || null,
        content: formatKnowledgeContent(formData.content),
        category: formData.category,
        tags: formData.tags,
        source: formData.source
      });
      
      setSuccess('知识点更新成功！');
      setIsEditing(false);
      
      // 保存成功后延迟关闭模态框
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('保存失败:', error);
      setError('保存失败: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // 重置表单数据
    const contentText = parseKnowledgeContent(item.content);
    setFormData({
      title: item.title || '',
      content: contentText,
      category: item.category || '技术',
      tags: item.tags || '',
      source: item.source || 'manual'
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      if (isEditing) {
        handleCancelEdit();
      } else {
        onClose();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isEditing) {
      e.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isEditing, handleSave]);

  if (!item) return null;

  const tags = formData.tags ? formData.tags.split(',').filter(tag => tag.trim()) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          {/* 头部 - 与 KnowledgeEditor 保持一致 */}
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? '编辑知识点' : '查看知识点'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isEditing ? `正在编辑: ${item.title || '未命名知识点'}` : '查看知识点详细信息'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              title="关闭 (Esc)"
              disabled={isSaving}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 成功/错误消息 - 与 KnowledgeEditor 保持一致 */}
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

          {isEditing ? (
            /* 编辑模式 - 与 KnowledgeEditor 完全一致的布局 */
            <form onSubmit={handleSave} className="space-y-6">
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
                  <div className="text-sm text-gray-500">
                    {formData.content.length} 字符
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
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 分类 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="技术">技术</option>
                    <option value="产品">产品</option>
                    <option value="设计">设计</option>
                    <option value="运营">运营</option>
                    <option value="市场">市场</option>
                    <option value="文档">文档</option>
                  </select>
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
                  快捷键: Ctrl+Enter 保存 • Esc 取消
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !formData.content.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isSaving && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isSaving ? '保存中...' : '更新知识点'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* 查看模式 - 与编辑模式相同的布局结构，但是只读显示 */
            <div className="space-y-6">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800">
                  {formData.title || '未命名知识点'}
                </div>
              </div>

              {/* 内容 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    内容
                  </label>
                  <div className="text-sm text-gray-500">
                    {formData.content.length} 字符
                  </div>
                </div>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 min-h-[300px]">
                  <div className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                    {displayContent}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 分类 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800">
                    {formData.category}
                  </div>
                </div>

                {/* 标签 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800">
                    {formData.tags || '未分类'}
                  </div>
                </div>
              </div>

              {/* 来源 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  来源
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800">
                  {formData.source === 'manual' ? '手动添加' : 
                   formData.source === 'chat' ? 'AI对话' :
                   formData.source === 'import' ? '导入' :
                   formData.source === 'web' ? '网页采集' :
                   formData.source === 'document' ? '文档解析' : formData.source}
                </div>
              </div>

              {/* 底部信息和操作按钮 */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  <div>创建时间: {formatDate(item.createdAt)}</div>
                  <div>最后更新: {formatDate(item.updatedAt || item.createdAt)}</div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleEditClick}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}