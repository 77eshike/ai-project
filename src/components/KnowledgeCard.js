// components/KnowledgeCard.js - 完整修复版本（优化状态显示）
import { useState } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

// 改进的标题截断工具函数
const truncateTitle = (title, maxLength = 60) => {
  if (!title || title.trim() === '') return '未命名知识点';
  const cleanTitle = title.trim();
  if (cleanTitle.length <= maxLength) return cleanTitle;
  return cleanTitle.substring(0, maxLength) + '...';
};

// 安全的内容预览函数
const getSafeContentPreview = (content) => {
  if (!content) return '暂无内容';
  
  try {
    // 尝试解析JSON格式的内容
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed[0]?.content) {
      const textContent = parsed.map(item => item.content).join(' ');
      return textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
    }
    return String(content).substring(0, 100) + (content.length > 100 ? '...' : '');
  } catch (e) {
    // 如果不是JSON，直接返回文本内容
    return String(content).substring(0, 100) + (content.length > 100 ? '...' : '');
  }
};

// 安全获取日期
const getSafeDate = (dateString) => {
  if (!dateString) return '未知日期';
  try {
    return new Date(dateString).toLocaleDateString('zh-CN');
  } catch (e) {
    return '未知日期';
  }
};

export default function KnowledgeCard({ item, viewMode, onEdit, onViewDetail }) {
  const { deleteKnowledge } = useKnowledge();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个知识点吗？此操作不可撤销。')) {
      setIsDeleting(true);
      try {
        await deleteKnowledge(item.id);
      } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败: ' + error.message);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(item);
  };

  const handleCardClick = () => {
    if (onViewDetail) {
      onViewDetail(item);
    }
  };

  // 安全获取分类和标签
  const category = item.category || '未分类';
  const tags = Array.isArray(item.tags) ? item.tags : 
               typeof item.tags === 'string' ? item.tags.split(',').filter(tag => tag.trim()) : 
               [];

  // 检查是否为临时数据
  const isTemp = item.id && item.id.startsWith('temp-');
  const saveFailed = item._saveFailed;

  if (viewMode === 'list') {
    return (
      <div 
        className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow group cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* 修复列表视图标题 */}
            <div className="flex items-start gap-2 mb-2">
              <h3 
                className="font-medium text-gray-900 text-lg break-words line-clamp-2 flex-1"
                title={item.title || '未命名知识点'}
              >
                {truncateTitle(item.title, 80)}
              </h3>
              {isTemp && !saveFailed && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                  <svg className="w-3 h-3 inline mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  保存中...
                </span>
              )}
              {isTemp && saveFailed && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  保存失败
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                {category}
              </span>
              
              {tags.map((tag, i) => (
                tag.trim() && (
                  <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded whitespace-nowrap">
                    {tag.trim()}
                  </span>
                )
              ))}
            </div>
            
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {getSafeContentPreview(item.content)}
            </p>
          </div>
          
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={handleEdit}
              disabled={isDeleting || isTemp}
              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
              title="编辑"
            >
              {isDeleting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
              title="删除"
            >
              {isDeleting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {item.source || '用户添加'}
          </span>
          <span className="text-xs text-gray-500">
            {getSafeDate(item.updatedAt || item.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // 网格视图
  return (
    <div 
      className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow group flex flex-col h-full cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          {/* 修复网格视图标题 */}
          <div className="flex items-start gap-2">
            <h3 
              className="font-medium text-gray-900 break-words line-clamp-2 flex-1"
              title={item.title || '未命名知识点'}
            >
              {truncateTitle(item.title, 50)}
            </h3>
            {isTemp && !saveFailed && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                <svg className="w-3 h-3 inline mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                保存中...
              </span>
            )}
            {isTemp && saveFailed && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                保存失败
              </span>
            )}
          </div>
        </div>
        
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
          <button
            onClick={handleEdit}
            disabled={isDeleting || isTemp}
            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
            title="编辑"
          >
            {isDeleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
            title="删除"
          >
            {isDeleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
          {category}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 flex-1 mb-3 line-clamp-3">
        {getSafeContentPreview(item.content)}
      </p>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag, i) => (
            tag.trim() && (
              <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded whitespace-nowrap">
                {tag.trim()}
              </span>
            )
          ))}
          {tags.length > 3 && (
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
        <span>{item.source || '用户添加'}</span>
        <span>{getSafeDate(item.updatedAt || item.createdAt)}</span>
      </div>
    </div>
  );
}