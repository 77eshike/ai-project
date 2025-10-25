// src/components/KnowledgeTab.js - 完整版本（包含编辑和生成项目功能）
import { useState, useCallback, useEffect } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';
import KnowledgeEditor from './KnowledgeEditor';

const KnowledgeTab = () => {
  const {
    knowledgeItems,
    categories,
    tags,
    isLoading,
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    deleteKnowledge,
    updateKnowledge,
    setEditingKnowledge,
    clearEditingKnowledge,
    editingKnowledge,
    generateProjectFromKnowledge,
    projectGeneration,
    getFilteredKnowledge,
    getStatistics,
    getRecommendedForProjectGeneration
  } = useKnowledge();

  const [localSearch, setLocalSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [generatingProjectId, setGeneratingProjectId] = useState(null);

  // 处理编辑
  const handleEdit = useCallback((knowledge) => {
    setEditingKnowledge(knowledge);
  }, [setEditingKnowledge]);

  // 处理保存编辑
  const handleSaveEdit = useCallback(async (id, knowledgeData) => {
    try {
      await updateKnowledge(id, knowledgeData);
      clearEditingKnowledge();
    } catch (error) {
      console.error('保存编辑失败:', error);
      throw error;
    }
  }, [updateKnowledge, clearEditingKnowledge]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    clearEditingKnowledge();
  }, [clearEditingKnowledge]);

  // 🔧 新增：处理生成项目
  const handleGenerateProject = useCallback(async (knowledgeId) => {
    setGeneratingProjectId(knowledgeId);
    try {
      await generateProjectFromKnowledge(knowledgeId);
      // 成功提示会在 KnowledgeContext 中处理
    } catch (error) {
      console.error('生成项目失败:', error);
    } finally {
      setGeneratingProjectId(null);
    }
  }, [generateProjectFromKnowledge]);

  // 处理搜索
  const handleSearch = useCallback(() => {
    setSearchQuery(localSearch);
  }, [localSearch, setSearchQuery]);

  // 处理分类筛选
  const handleCategoryFilter = useCallback((category) => {
    setFilters({ category });
  }, [setFilters]);

  // 处理删除确认
  const handleDeleteConfirm = useCallback(async (id) => {
    try {
      await deleteKnowledge(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('删除失败:', error);
    }
  }, [deleteKnowledge]);

  // 获取内容预览
  const getContentPreview = useCallback((content) => {
    if (!content) return '暂无内容';
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed[0]?.content) {
        return parsed.map(item => item.content).join(' ').substring(0, 150) + '...';
      }
    } catch (e) {
      // 不是 JSON，直接返回
    }
    
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  }, []);

  // 处理选择项目
  const handleSelectItem = useCallback((id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 处理全选
  const handleSelectAll = useCallback(() => {
    const filtered = getFilteredKnowledge();
    if (selectedItems.size === filtered.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filtered.map(item => item.id)));
    }
  }, [getFilteredKnowledge, selectedItems.size]);

  // 清除选择
  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClearSelection]);

  const filteredKnowledge = getFilteredKnowledge();
  const statistics = getStatistics();
  const recommendedForProjects = getRecommendedForProjectGeneration();

  // 知识库项组件
  const KnowledgeItem = ({ item, showProjectButton = false }) => (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all ${
      selectedItems.has(item.id) ? 'ring-2 ring-blue-500 border-blue-300' : ''
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={selectedItems.has(item.id)}
            onChange={() => handleSelectItem(item.id)}
            className="mt-1 text-blue-600 focus:ring-blue-500"
          />
          <h3 className="font-semibold text-gray-900 text-lg flex-1">
            {item.title || '未命名知识点'}
          </h3>
        </div>
        <div className="flex space-x-2 ml-3">
          {/* 🔧 生成项目按钮 */}
          {showProjectButton && (
            <button
              onClick={() => handleGenerateProject(item.id)}
              disabled={generatingProjectId === item.id || projectGeneration.isGenerating}
              className="text-green-600 hover:text-green-800 disabled:text-gray-400 transition-colors p-1"
              title="生成待定项目"
            >
              {generatingProjectId === item.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </button>
          )}
          
          {/* 编辑按钮 */}
          <button
            onClick={() => handleEdit(item)}
            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
            title="编辑知识点"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(item.id)}
            className="text-red-600 hover:text-red-800 transition-colors p-1"
            title="删除知识点"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="text-gray-600 text-sm mb-3 line-clamp-3">
        {getContentPreview(item.content)}
      </div>
      
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-500">
        <div className="flex space-x-2">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {item.category || '未分类'}
          </span>
          {item.tags && item.tags.split(',').map((tag, index) => (
            tag.trim() && (
              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {tag.trim()}
              </span>
            )
          ))}
        </div>
        <div className="text-xs text-gray-400">
          {new Date(item.updatedAt || item.createdAt).toLocaleDateString('zh-CN')}
        </div>
      </div>

      {/* 生成项目状态提示 */}
      {generatingProjectId === item.id && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
          🚀 正在生成项目...
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部统计 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">知识库</h1>
          <p className="text-gray-600">管理您的知识点，支持编辑、搜索和生成项目</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
              <div className="text-sm text-gray-600">总知识点</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">{statistics.technical}</div>
              <div className="text-sm text-gray-600">技术相关</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">{statistics.product}</div>
              <div className="text-sm text-gray-600">产品相关</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-orange-600">{recommendedForProjects.length}</div>
              <div className="text-sm text-gray-600">可生成项目</div>
            </div>
          </div>
        </div>

        {/* 推荐生成项目的知识点 */}
        {recommendedForProjects.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">推荐生成项目</h2>
              <span className="text-sm text-gray-500">内容丰富的技术知识点</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedForProjects.slice(0, 3).map(item => (
                <KnowledgeItem key={item.id} item={item} showProjectButton={true} />
              ))}
            </div>
          </div>
        )}

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索知识点标题、内容或标签..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 分类筛选 */}
            <div className="flex space-x-2">
              <select
                value={filters.category}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="所有">所有分类</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>

          {/* 批量操作 */}
          {selectedItems.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 text-sm">
                  已选择 {selectedItems.size} 个项目
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleClearSelection}
                    className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    取消选择
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 知识库列表 */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* 列表头部 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  所有知识点 ({filteredKnowledge.length})
                </h2>
                {filteredKnowledge.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedItems.size === filteredKnowledge.length ? '取消全选' : '全选'}
                  </button>
                )}
              </div>
              
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setLocalSearch('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  清除搜索
                </button>
              )}
            </div>

            {/* 知识库网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredKnowledge.map(item => (
                <KnowledgeItem key={item.id} item={item} showProjectButton={true} />
              ))}
            </div>

            {/* 空状态 */}
            {filteredKnowledge.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? '没有找到相关知识点' : '暂无知识点'}
                </h3>
                <p className="text-gray-500">
                  {searchQuery ? '尝试调整搜索关键词' : '您还没有保存任何知识点到知识库'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 编辑模态框 */}
      {editingKnowledge && (
        <KnowledgeEditor
          item={editingKnowledge}
          onClose={handleCancelEdit}
        />
      )}

      {/* 删除确认模态框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除这个知识点吗？此操作无法撤销。</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeTab;