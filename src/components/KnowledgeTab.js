// components/KnowledgeTab.js - 完整修复版本
import { useState, useEffect, useMemo } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

// 知识库统计卡片组件
const StatCard = ({ title, value, subtitle, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="text-blue-600 text-2xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// 标题截断工具函数
const truncateTitle = (title, maxLength = 50) => {
  if (!title) return '未命名文档';
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

// 内容截断工具函数
const truncateContent = (content, maxLength = 120) => {
  if (!content) return '暂无描述';
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

// 知识库文档卡片组件
const DocumentCard = ({ document, onView, onDownload, onDelete }) => {
  const getCategoryColor = (category) => {
    const colors = {
      '技术': 'bg-green-100 text-green-800',
      '产品': 'bg-blue-100 text-blue-800',
      '设计': 'bg-purple-100 text-purple-800',
      '运营': 'bg-orange-100 text-orange-800',
      '市场': 'bg-pink-100 text-pink-800',
      '文档': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // 处理后的标题和描述
  const displayTitle = truncateTitle(document.title, 45);
  const displayDescription = truncateContent(document.description, 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex justify-between items-start mb-3 flex-shrink-0">
        <div className="flex-min-w-0">
          {/* 修复标题显示 */}
          <h3 
            className="kb-title-fix font-medium text-gray-900 text-lg mb-1"
            title={document.title}
          >
            {displayTitle}
          </h3>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
            {document.category}
          </span>
        </div>
        <div className="text-gray-400 text-sm whitespace-nowrap ml-2 flex-shrink-0">
          {document.date}
        </div>
      </div>
      
      {/* 描述区域 */}
      <div className="mb-4 flex-1 min-h-0">
        <p 
          className="kb-description-fix text-gray-600 text-sm"
          title={document.description}
        >
          {displayDescription}
        </p>
      </div>
      
      {/* 标签和操作按钮区域 */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {document.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index} 
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded truncate max-w-20"
              title={tag}
            >
              {tag}
            </span>
          ))}
          {document.tags.length > 3 && (
            <span className="text-xs text-gray-400" title={`还有 ${document.tags.length - 3} 个标签`}>
              +{document.tags.length - 3}
            </span>
          )}
        </div>
        <div className="flex space-x-1 flex-shrink-0">
          <button
            onClick={() => onView(document)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-blue-50 whitespace-nowrap"
            title="查看详情"
          >
            查看
          </button>
          <button
            onClick={() => onDownload(document)}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-gray-50 whitespace-nowrap"
            title="下载文档"
          >
            下载
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(document.id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-red-50 whitespace-nowrap"
              title="删除文档"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 文档查看模态框
const DocumentViewModal = ({ document, isOpen, onClose, onDelete }) => {
  if (!isOpen || !document) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 break-words-safe" title={document.title}>
              {document.title}
            </h3>
            <div className="flex items-center mt-1 space-x-2">
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {document.category}
              </span>
              <span className="text-sm text-gray-500">创建时间: {document.date}</span>
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            {onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('确定要删除这个知识点吗？此操作不可恢复。')) {
                    onDelete(document.id);
                    onClose();
                  }
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-3 py-1 rounded border border-red-200 hover:bg-red-50 whitespace-nowrap"
              >
                删除
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">标签</h4>
            <div className="flex flex-wrap gap-2">
              {document.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">内容</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto break-words-safe">
                {document.content}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={() => {
              const blob = new Blob([document.content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${document.title}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            下载文档
          </button>
        </div>
      </div>
    </div>
  );
};

// 空状态组件
const EmptyState = ({ totalItems, onAddExample }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
      <div className="text-gray-400 text-6xl mb-4">📚</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {totalItems === 0 ? '知识库为空' : '未找到文档'}
      </h3>
      <p className="text-gray-600 mb-6">
        {totalItems === 0 
          ? '还没有任何知识点，尝试在AI对话中保存一些知识点吧！' 
          : '尝试调整搜索条件或选择其他分类'
        }
      </p>
      {totalItems === 0 && (
        <button
          onClick={onAddExample}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          添加示例数据
        </button>
      )}
    </div>
  );
};

export default function KnowledgeTab() {
  const { 
    knowledgeItems, 
    isLoading,
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    getFilteredKnowledge,
    addKnowledge,
    deleteKnowledge,
    loadKnowledgeItems
  } = useKnowledge();
  
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 添加调试日志
  useEffect(() => {
    console.log('🔍 KnowledgeTab 调试信息:', {
      deleteKnowledge: typeof deleteKnowledge,
      knowledgeItemsCount: knowledgeItems.length,
      isLoading,
      isFunction: typeof deleteKnowledge === 'function'
    });
  }, [deleteKnowledge, knowledgeItems, isLoading]);

  // 分类选项
  const categories = ['全部', '技术', '产品', '设计', '运营', '市场', '文档'];

  // 使用真实的 knowledgeItems 数据
  const displayDocuments = useMemo(() => {
    let filtered = getFilteredKnowledge();
    
    if (selectedCategory && selectedCategory !== '全部') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    return filtered;
  }, [knowledgeItems, selectedCategory, searchQuery, filters, getFilteredKnowledge]);

  // 格式化文档数据用于显示
  const formattedDocuments = useMemo(() => {
    return displayDocuments.map(item => ({
      id: item.id,
      title: item.title || '未命名文档',
      category: item.category || '未分类',
      description: item.content || '暂无描述',
      tags: Array.isArray(item.tags) ? item.tags : 
            typeof item.tags === 'string' ? item.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('zh-CN') : '未知日期',
      content: item.content || '暂无内容',
      source: item.source || '未知来源'
    }));
  }, [displayDocuments]);

  // 统计信息使用真实数据
  const stats = useMemo(() => {
    const total = knowledgeItems.length;
    const byCategory = categories.reduce((acc, category) => {
      if (category !== '全部') {
        acc[category] = knowledgeItems.filter(item => item.category === category).length;
      }
      return acc;
    }, {});

    const newThisMonth = knowledgeItems.filter(item => 
      item.createdAt && new Date(item.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return { 
      total, 
      ...byCategory,
      newThisMonth 
    };
  }, [knowledgeItems, categories]);

  // 安全的删除函数
  const handleDeleteDocument = (documentId) => {
    console.log('🗑️ 尝试删除文档:', documentId, {
      deleteKnowledgeType: typeof deleteKnowledge,
      isFunction: typeof deleteKnowledge === 'function'
    });
    
    if (window.confirm('确定要删除这个知识点吗？此操作不可恢复。')) {
      if (deleteKnowledge && typeof deleteKnowledge === 'function') {
        deleteKnowledge(documentId).catch(error => {
          console.error('删除失败:', error);
          alert('删除失败: ' + error.message);
        });
      } else {
        console.error('❌ deleteKnowledge 不可用:', {
          type: typeof deleteKnowledge,
          value: deleteKnowledge
        });
        // 备用方案：直接调用API
        temporaryDeleteKnowledge(documentId);
      }
    }
  };

  // 备用删除函数
  const temporaryDeleteKnowledge = async (id) => {
    try {
      console.log('🔄 使用备用删除函数删除:', id);
      
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 备用删除成功');
        // 重新加载数据
        await loadKnowledgeItems();
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('❌ 备用删除失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const handleViewDocument = (document) => {
    setViewingDocument(document);
    setIsModalOpen(true);
  };

  const handleDownloadDocument = (document) => {
    const blob = new Blob([document.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setFilters({ 
      category: category === '全部' ? '' : category 
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setViewingDocument(null);
  };

  const handleAddExampleData = () => {
    const exampleData = {
      title: '欢迎使用知识库',
      category: '文档',
      content: '这是您的第一个知识点！您可以在AI对话中保存重要的对话内容到这里。',
      tags: ['欢迎', '使用指南', '示例'],
      source: '系统示例'
    };
    
    addKnowledge(exampleData);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('全部');
    setFilters({ category: '', tags: [] });
  };

  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载知识库...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 调试信息 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <strong>调试信息:</strong> 
            <div>总知识点: {knowledgeItems.length}</div>
            <div>显示: {formattedDocuments.length}</div>
            <div>deleteKnowledge 类型: {typeof deleteKnowledge}</div>
            <div>是否为函数: {typeof deleteKnowledge === 'function' ? '是' : '否'}</div>
          </div>
        </div>
      )}

      {/* 知识库统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="总文档数" 
          value={stats.total}
          icon="📚"
        />
        <StatCard 
          title="技术文档" 
          value={stats.技术 || 0}
          subtitle="技术相关文档"
          icon="💻"
        />
        <StatCard 
          title="产品文档" 
          value={stats.产品 || 0}
          subtitle="产品相关文档"
          icon="📊"
        />
        <StatCard 
          title="本月新增" 
          value={stats.newThisMonth}
          subtitle="最近30天"
          icon="🆕"
        />
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索文档标题、内容、标签..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 文档列表 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            知识库文档 
            {formattedDocuments.length > 0 && (
              <span className="text-blue-600 ml-1">({formattedDocuments.length})</span>
            )}
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              共 {knowledgeItems.length} 个文档
            </span>
            {(searchQuery || selectedCategory !== '全部') && (
              <button
                onClick={handleClearSearch}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>

        {formattedDocuments.length === 0 ? (
          <EmptyState 
            totalItems={knowledgeItems.length}
            onAddExample={handleAddExampleData}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formattedDocuments.map(document => (
              <DocumentCard
                key={document.id}
                document={document}
                onView={handleViewDocument}
                onDownload={handleDownloadDocument}
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        )}
      </div>

      {/* 文档查看模态框 */}
      <DocumentViewModal
        document={viewingDocument}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDelete={handleDeleteDocument}
      />
    </div>
  );
}