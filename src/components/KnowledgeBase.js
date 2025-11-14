// components/KnowledgeBase.js - 修复版本
import { useState, useEffect, useMemo } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';
import KnowledgeList from './KnowledgeList';
import KnowledgeFilters from './KnowledgeFilters';
import KnowledgeEditor from './KnowledgeEditor';
import KnowledgeDetail from './KnowledgeDetail';
import QuickCreateButton from './QuickCreateButton';
import { 
  PlusIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function KnowledgeBase() {
  // 🔧 关键修复：安全解构，提供默认值
  const knowledgeContext = useKnowledge();
  
  const { 
    isLoading = false, 
    filteredKnowledgeItems = [],
    knowledgeItems = [],
    searchQuery = '',
    setSearchQuery = () => {},
    addKnowledge = () => Promise.reject(new Error('addKnowledge not available')),
    updateKnowledge = () => Promise.reject(new Error('updateKnowledge not available')),
    setEditingKnowledge = () => console.warn('setEditingKnowledge not available'),
    clearEditingKnowledge = () => console.warn('clearEditingKnowledge not available'),
    editingKnowledge = null
  } = knowledgeContext || {};
  
  // 🔧 关键修复：添加独立的状态控制编辑器
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [error, setError] = useState('');
  const [viewingDetail, setViewingDetail] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // 🔧 修复：使用 filteredKnowledgeItems 而不是重新计算
  const filteredItems = filteredKnowledgeItems;

  // 同步本地搜索和全局搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setSearchQuery(localSearch);
      } catch (error) {
        console.error('设置搜索查询失败:', error);
        setError('搜索功能暂时不可用');
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // 🔧 关键修复：修改新建知识点函数
  const handleNewKnowledge = () => {
    console.log('🎯 点击新建知识点按钮');
    setEditingKnowledge(null);
    setIsEditorOpen(true);
  };

  const handleEditKnowledge = (item) => {
    console.log('✏️ 编辑知识点:', item?.id);
    setEditingKnowledge(item);
    setIsEditorOpen(true);
  };

  const handleViewDetail = (item) => {
    setViewingDetail(item);
  };

  const handleCloseDetail = () => {
    setViewingDetail(null);
  };

  // 🔧 关键修复：添加保存处理函数
  const handleSaveKnowledge = async (id, knowledgeData) => {
    try {
      let result;
      if (id && id.startsWith('temp-')) {
        console.log('🔄 保存临时知识点:', id);
        result = await addKnowledge(knowledgeData);
      } else {
        console.log('✏️ 更新现有知识点:', id);
        result = await updateKnowledge(id, knowledgeData);
      }
      
      if (result?.success) {
        console.log('✅ 保存成功');
        handleCloseEditor();
        return result;
      } else {
        throw new Error(result?.error || '保存操作未成功');
      }
    } catch (error) {
      console.error('保存失败:', error);
      setError('保存失败: ' + error.message);
      throw error;
    }
  };

  // 🔧 关键修复：修改关闭编辑器函数
  const handleCloseEditor = () => {
    console.log('❌ 关闭编辑器');
    setIsEditorOpen(false);
    setEditingKnowledge(null);
    clearEditingKnowledge();
    setError('');
  };

  // 🔧 安全添加示例数据
  const handleAddSampleData = async () => {
    const sampleItems = [
      {
        title: 'React最佳实践',
        content: '使用函数组件和Hooks，保持组件简洁，合理使用useMemo和useCallback优化性能。',
        category: '技术',
        tags: 'React,前端,JavaScript',
        source: '团队内部文档'
      },
      {
        title: '项目开发流程',
        content: '需求分析 → 技术设计 → 开发 → 测试 → 部署 → 监控维护',
        category: '流程',
        tags: '项目管理,开发流程',
        source: '项目管理手册'
      },
      {
        title: 'API设计规范',
        content: 'RESTful API设计原则：使用名词复数、合适的HTTP方法、一致的错误处理格式。',
        category: '技术',
        tags: 'API,后端,规范',
        source: '技术团队规范'
      }
    ];

    try {
      setError('');
      for (const item of sampleItems) {
        await addKnowledge(item);
      }
      // 显示成功消息
      if (typeof window !== 'undefined') {
        alert('示例数据添加成功！');
      }
    } catch (error) {
      console.error('添加示例数据失败:', error);
      setError('添加示例数据失败: ' + error.message);
    }
  };

  // 🔧 安全统计信息
  const stats = useMemo(() => {
    try {
      return {
        total: knowledgeItems.length,
        technical: knowledgeItems.filter(item => item.category === '技术').length,
        process: knowledgeItems.filter(item => item.category === '流程').length,
        product: knowledgeItems.filter(item => item.category === '产品').length,
        recent: knowledgeItems.filter(item => {
          try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(item.createdAt) > oneWeekAgo;
          } catch {
            return false;
          }
        }).length
      };
    } catch (error) {
      console.error('计算统计信息失败:', error);
      return { total: 0, technical: 0, process: 0, product: 0, recent: 0 };
    }
  }, [knowledgeItems]);

  // 🔧 调试信息
  useEffect(() => {
    console.log('📊 KnowledgeBase 状态:', {
      总数据条数: knowledgeItems.length,
      过滤后条数: filteredItems.length,
      加载中: isLoading,
      编辑器打开: isEditorOpen,
      编辑项: editingKnowledge?.id,
      搜索词: searchQuery,
      上下文可用: !!knowledgeContext
    });
  }, [knowledgeItems.length, filteredItems.length, isLoading, isEditorOpen, editingItem, searchQuery, knowledgeContext]);

  // 🔧 关键修复：检查 Context 可用性
  if (!knowledgeContext) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">系统配置错误</h3>
          <p className="text-gray-600 mb-4">知识库功能暂时不可用，请刷新页面或联系管理员</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">知识库</h1>
              </div>
              <p className="text-gray-600">集中管理所有重要信息和知识点</p>
              
              {/* 错误显示 */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800 font-medium">错误</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              )}
              
              {/* 快速统计 */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center text-sm text-gray-600">
                  <ChartBarIcon className="h-4 w-4 mr-1" />
                  <span>共 {stats.total} 条知识点</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  <span>技术文档: {stats.technical}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span>流程文档: {stats.process}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  <span>本周新增: {stats.recent}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={handleAddSampleData}
                disabled={isLoading}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                添加示例数据
              </button>
              
              {/* 添加快速新建按钮 */}
              <QuickCreateButton />
              
              <button
                onClick={handleNewKnowledge}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                新建知识点
              </button>
            </div>
          </div>
        </div>

        {/* 搜索和工具栏 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* 搜索框 */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="搜索知识点标题、内容或标签..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
            
            {/* 视图切换和筛选 */}
            <div className="flex items-center space-x-4">
              {/* 视图切换 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  disabled={isLoading}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  disabled={isLoading}
                  className={`p-2 rounded-md ${
                    viewMode === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              
              {/* 搜索结果统计 */}
              <div className="text-sm text-gray-600">
                找到 {filteredItems.length} 条结果
                {searchQuery && (
                  <span>，搜索词: "{searchQuery}"</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* 筛选区域 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <KnowledgeFilters />
        </div>
        
        {/* 内容区域 */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">加载知识库中...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? '没有找到相关知识点' : '知识库为空'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? `没有找到包含"${searchQuery}"的知识点，尝试调整搜索词或筛选条件。`
                  : '还没有任何知识点，开始创建第一个知识点来丰富您的知识库吧！'
                }
              </p>
              {!searchQuery && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleNewKnowledge}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    创建第一个知识点
                  </button>
                </div>
              )}
            </div>
          ) : (
            <KnowledgeList 
              items={filteredItems} 
              viewMode={viewMode}
              onEdit={handleEditKnowledge}
              onViewDetail={handleViewDetail}
            />
          )}
        </div>
      </div>
      
      {/* 🔧 关键修复：修改编辑器渲染条件 */}
      {isEditorOpen && (
        <KnowledgeEditor 
          item={editingKnowledge}
          onSave={handleSaveKnowledge}
          onClose={handleCloseEditor}
        />
      )}

      {/* 详情查看模态框 */}
      {viewingDetail && (
        <KnowledgeDetail 
          item={viewingDetail}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}