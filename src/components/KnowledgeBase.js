// components/KnowledgeBase.js
import { useState, useEffect } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';
import KnowledgeList from './KnowledgeList';
import KnowledgeFilters from './KnowledgeFilters';
import KnowledgeEditor from './KnowledgeEditor';
import { 
  PlusIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function KnowledgeBase() {
  const { 
    isLoading, 
    getFilteredKnowledge, 
    knowledgeItems,
    searchQuery,
    setSearchQuery,
    addKnowledge 
  } = useKnowledge();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' 或 'list'
  const [localSearch, setLocalSearch] = useState('');
  
  const filteredItems = getFilteredKnowledge();

  // 同步本地搜索和全局搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const handleNewKnowledge = () => {
    setEditingItem(null);
    setIsEditorOpen(true);
  };

  const handleEditKnowledge = (item) => {
    setEditingItem(item);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingItem(null);
  };

  // 快速创建示例数据
  const handleAddSampleData = () => {
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

    sampleItems.forEach(item => {
      addKnowledge(item);
    });
  };

  // 统计信息
  const stats = {
    total: knowledgeItems.length,
    technical: knowledgeItems.filter(item => item.category === '技术').length,
    process: knowledgeItems.filter(item => item.category === '流程').length,
    recent: knowledgeItems.filter(item => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(item.createdAt) > oneWeekAgo;
    }).length
  };

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
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                添加示例数据
              </button>
              <button
                onClick={handleNewKnowledge}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
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
              />
            </div>
            
            {/* 视图切换和筛选 */}
            <div className="flex items-center space-x-4">
              {/* 视图切换 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${
                    viewMode === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
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
                <button
                  onClick={handleNewKnowledge}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建第一个知识点
                </button>
              )}
            </div>
          ) : (
            <KnowledgeList 
              items={filteredItems} 
              viewMode={viewMode}
              onEdit={handleEditKnowledge}
            />
          )}
        </div>
      </div>
      
      {/* 编辑器模态框 */}
      {isEditorOpen && (
        <KnowledgeEditor 
          item={editingItem}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}