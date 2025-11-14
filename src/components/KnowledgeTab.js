// src/components/KnowledgeTab.js - 完整修复版本，添加详情查看功能
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';
import { useSession } from 'next-auth/react';
import KnowledgeEditor from './KnowledgeEditor';
import KnowledgeList from './KnowledgeList';
import KnowledgeFilters from './KnowledgeFilters';
import KnowledgeDetail from './KnowledgeDetail';

const KnowledgeTab = () => {
  // 🔧 关键修复：安全解构，提供默认值
  const knowledgeContext = useKnowledge();
  
  // 安全解构所有函数和状态，提供默认值
  const {
    knowledgeItems = [],
    categories = [],
    tags = [],
    isLoading = false,
    searchQuery = '',
    filters = {},
    setSearchQuery = () => console.warn('setSearchQuery not available'),
    setFilters = () => console.warn('setFilters not available'),
    deleteKnowledge = () => Promise.reject(new Error('deleteKnowledge not available')),
    updateKnowledge = () => Promise.reject(new Error('updateKnowledge not available')),
    addKnowledge = () => Promise.reject(new Error('addKnowledge not available')),
    setEditingKnowledge = () => console.warn('setEditingKnowledge not available'),
    clearEditingKnowledge = () => console.warn('clearEditingKnowledge not available'),
    editingKnowledge = null,
    generateProjectFromKnowledge = () => Promise.reject(new Error('generateProjectFromKnowledge not available')),
    projectGeneration = {},
    filteredKnowledgeItems = [],
    isInitialized = false,
    loadKnowledgeItems = () => {},
    clearError = () => {},
    addCategory = () => {},
    addTag = () => {}
  } = knowledgeContext || {};

  const { data: session, status: sessionStatus } = useSession();
  
  const [localSearch, setLocalSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [generatingProjectId, setGeneratingProjectId] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [contextError, setContextError] = useState(null);
  const [viewingDetail, setViewingDetail] = useState(null);
  
  // 🔧 关键修复：添加独立的状态控制编辑器模态框
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // 认证状态
  const isAuthenticated = sessionStatus === 'authenticated';
  const isSessionLoading = sessionStatus === 'loading';

  // 🔧 关键修复：检查 Context 可用性
  useEffect(() => {
    if (!knowledgeContext) {
      setContextError('KnowledgeContext 未提供，请确保组件被 KnowledgeProvider 包裹');
      console.error('❌ KnowledgeContext 不可用');
    } else {
      setContextError(null);
    }
  }, [knowledgeContext]);

  // 🔧 关键修复：简化数据监控
  useEffect(() => {
    console.log('🔍 知识库状态:', {
      数据条数: knowledgeItems.length,
      过滤后条数: filteredKnowledgeItems.length,
      加载中: isLoading,
      已认证: isAuthenticated,
      已初始化: isInitialized,
      contextAvailable: !!knowledgeContext,
      contextError: contextError,
      编辑器打开: isEditorOpen,
      编辑项: editingKnowledge?.id
    });
  }, [knowledgeItems.length, filteredKnowledgeItems.length, isLoading, isAuthenticated, isInitialized, knowledgeContext, contextError, isEditorOpen, editingKnowledge]);

  // 显示 Toast 提示
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(prev => prev?.id === Date.now() ? null : prev);
    }, 5000);
  }, []);

  // 详情查看功能
  const handleViewDetail = useCallback((knowledge) => {
    setViewingDetail(knowledge);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setViewingDetail(null);
  }, []);

  // 🔧 关键修复：安全的处理函数
  const handleEdit = useCallback((knowledge) => {
    if (!isAuthenticated) {
      showToast('请先登录以编辑知识点', 'warning');
      return;
    }
    
    if (!knowledgeContext) {
      showToast('系统配置错误，请刷新页面', 'error');
      return;
    }
    
    try {
      console.log('✏️ 编辑知识点:', knowledge?.id);
      setEditingKnowledge(knowledge);
      setIsEditorOpen(true); // 打开编辑器
    } catch (error) {
      console.error('编辑失败:', error);
      showToast('编辑功能暂时不可用', 'error');
    }
  }, [isAuthenticated, setEditingKnowledge, showToast, knowledgeContext]);

  const handleSaveEdit = useCallback(async (id, knowledgeData) => {
    if (!isAuthenticated) {
      showToast('请先登录以保存知识点', 'warning');
      throw new Error('用户未认证');
    }

    if (!knowledgeContext) {
      showToast('系统配置错误，请刷新页面', 'error');
      throw new Error('KnowledgeContext 不可用');
    }

    try {
      let result;
      if (id && id.startsWith('temp-')) {
        console.log('🔄 保存临时知识点:', id);
        if (typeof addKnowledge !== 'function') {
          throw new Error('addKnowledge 函数不可用');
        }
        result = await addKnowledge(knowledgeData);
      } else {
        console.log('✏️ 更新现有知识点:', id);
        
        // 🔧 关键修复：检查 updateKnowledge 是否真的可用
        if (typeof updateKnowledge !== 'function') {
          throw new Error('updateKnowledge 函数不可用，请检查 KnowledgeContext 配置');
        }
        
        result = await updateKnowledge(id, knowledgeData);
      }
      
      if (result?.success) {
        clearEditingKnowledge();
        setIsEditorOpen(false); // 关闭编辑器
        showToast('知识点保存成功', 'success');
        return result;
      } else {
        throw new Error(result?.error || '保存操作未成功');
      }
    } catch (error) {
      console.error('保存编辑失败:', error);
      
      // 更详细的错误信息
      let errorMessage = error.message;
      if (error.message.includes('updateKnowledge not available')) {
        errorMessage = '更新功能暂时不可用，请刷新页面重试';
      } else if (error.message.includes('addKnowledge not available')) {
        errorMessage = '添加功能暂时不可用，请刷新页面重试';
      } else if (error.message.includes('网络') || error.message.includes('HTTP')) {
        errorMessage = '网络连接错误，请检查网络后重试';
      } else if (error.message.includes('登录')) {
        errorMessage = '登录状态已过期，请重新登录';
      }
      
      showToast(`保存失败: ${errorMessage}`, 'error');
      throw error;
    }
  }, [updateKnowledge, addKnowledge, clearEditingKnowledge, showToast, isAuthenticated, knowledgeContext]);

  const handleCancelEdit = useCallback(() => {
    try {
      clearEditingKnowledge();
      setIsEditorOpen(false); // 关闭编辑器
      console.log('❌ 关闭编辑器');
    } catch (error) {
      console.error('取消编辑失败:', error);
      showToast('取消编辑失败', 'error');
    }
  }, [clearEditingKnowledge, showToast]);

  const handleGenerateProject = useCallback(async (knowledgeId) => {
    if (!isAuthenticated) {
      showToast('请先登录以生成项目', 'warning');
      return;
    }

    if (knowledgeId.startsWith('temp-')) {
      showToast('请先保存知识点再生成项目', 'warning');
      return;
    }

    setGeneratingProjectId(knowledgeId);
    try {
      const result = await generateProjectFromKnowledge(knowledgeId);
      showToast('项目生成成功！', 'success');
      return result;
    } catch (error) {
      console.error('生成项目失败:', error);
      showToast('生成项目失败: ' + error.message, 'error');
      throw error;
    } finally {
      setGeneratingProjectId(null);
    }
  }, [generateProjectFromKnowledge, showToast, isAuthenticated]);

  const handleSearch = useCallback((query) => {
    if (!knowledgeContext) {
      showToast('系统配置错误，请刷新页面', 'error');
      return;
    }
    
    try {
      setSearchQuery(query);
    } catch (error) {
      console.error('搜索失败:', error);
      showToast('搜索功能暂时不可用', 'error');
    }
  }, [setSearchQuery, showToast, knowledgeContext]);

  const handleDeleteConfirm = useCallback(async (id) => {
    if (!isAuthenticated) {
      showToast('请先登录以删除知识点', 'warning');
      return;
    }

    if (!knowledgeContext) {
      showToast('系统配置错误，请刷新页面', 'error');
      return;
    }

    try {
      await deleteKnowledge(id);
      setShowDeleteConfirm(null);
      showToast('知识点删除成功', 'success');
      
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (error) {
      console.error('删除失败:', error);
      showToast('删除失败: ' + error.message, 'error');
    }
  }, [deleteKnowledge, showToast, isAuthenticated, knowledgeContext]);

  const handleSelectItem = useCallback((id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < 50) {
        newSet.add(id);
      } else {
        showToast(`最多只能选择 50 个项目`, 'warning');
      }
      return newSet;
    });
  }, [showToast]);

  const handleSelectAll = useCallback(() => {
    try {
      if (selectedItems.size === filteredKnowledgeItems.length) {
        setSelectedItems(new Set());
      } else {
        const limitedSelection = filteredKnowledgeItems.slice(0, 50);
        setSelectedItems(new Set(limitedSelection.map(item => item.id)));
        
        if (filteredKnowledgeItems.length > 50) {
          showToast(`已选择前 50 个项目`, 'info');
        }
      }
    } catch (error) {
      console.error('全选操作失败:', error);
      showToast('全选功能暂时不可用', 'error');
    }
  }, [filteredKnowledgeItems, selectedItems.size, showToast]);

  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleClearSearch = useCallback(() => {
    try {
      setSearchQuery('');
      setLocalSearch('');
      setFilters({});
    } catch (error) {
      console.error('清除搜索失败:', error);
      showToast('清除搜索失败', 'error');
    }
  }, [setSearchQuery, setFilters, showToast]);

  // 🔧 关键修复：修改新建知识点函数
  const handleCreateNew = useCallback(() => {
    if (!isAuthenticated) {
      showToast('请先登录以创建知识点', 'warning');
      return;
    }
    
    if (!knowledgeContext) {
      showToast('系统配置错误，请刷新页面', 'error');
      return;
    }
    
    try {
      console.log('🎯 点击新建知识点按钮');
      setEditingKnowledge(null); // 设置为 null 表示新建
      setIsEditorOpen(true);     // 打开编辑器
    } catch (error) {
      console.error('创建新知识点失败:', error);
      showToast('创建功能暂时不可用', 'error');
    }
  }, [isAuthenticated, setEditingKnowledge, showToast, knowledgeContext]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClearSelection();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector('input[type="text"]')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClearSelection]);

  // 同步搜索查询
  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  // 统计信息
  const statistics = useMemo(() => {
    try {
      return {
        total: knowledgeItems.length,
        technical: knowledgeItems.filter(item => item.category === '技术').length,
        product: knowledgeItems.filter(item => item.category === '产品').length,
        design: knowledgeItems.filter(item => item.category === '设计').length,
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
      return { total: 0, technical: 0, product: 0, design: 0, recent: 0 };
    }
  }, [knowledgeItems]);

  // 🔧 关键修复：添加调试信息组件
  const DebugInfo = () => {
    if (process.env.NODE_ENV === 'production') return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs z-50 max-w-sm">
        <h4 className="font-bold mb-2 border-b border-gray-600 pb-1">🔍 调试信息</h4>
        <div className="space-y-1">
          <div><strong>数据:</strong> {knowledgeItems.length} 条</div>
          <div><strong>过滤:</strong> {filteredKnowledgeItems.length} 条</div>
          <div><strong>加载:</strong> {isLoading ? '🔄' : '✅'}</div>
          <div><strong>认证:</strong> {isAuthenticated ? '✅' : '❌'}</div>
          <div><strong>会话:</strong> {sessionStatus}</div>
          <div><strong>用户ID:</strong> {session?.user?.id?.substring(0, 8) || '无'}</div>
          <div><strong>Context:</strong> {knowledgeContext ? '✅' : '❌'}</div>
          <div><strong>初始化:</strong> {isInitialized ? '✅' : '❌'}</div>
          <div><strong>编辑器打开:</strong> {isEditorOpen ? '✅' : '❌'}</div>
          <div><strong>编辑项:</strong> {editingKnowledge?.id || '无'}</div>
          {contextError && (
            <div><strong>错误:</strong> <span className="text-red-400">{contextError}</span></div>
          )}
        </div>
        <button 
          onClick={() => {
            console.log('=== 知识库完整状态 ===');
            console.log('Context对象:', knowledgeContext);
            console.log('数据:', knowledgeItems);
            console.log('会话:', session);
            console.log('加载状态:', isLoading);
            console.log('认证状态:', isAuthenticated);
            console.log('初始化状态:', isInitialized);
            console.log('编辑器状态:', { isEditorOpen, editingKnowledge });
            
            // 测试API
            fetch('/api/knowledge')
              .then(r => r.json())
              .then(data => {
                console.log('API响应:', data);
              })
              .catch(err => {
                console.error('API测试失败:', err);
              });
          }}
          className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs w-full"
        >
          打印完整状态
        </button>
        <button 
          onClick={() => {
            // 重新加载数据
            if (loadKnowledgeItems) {
              loadKnowledgeItems(true);
              showToast('重新加载数据中...', 'info');
            }
          }}
          className="mt-1 bg-green-600 text-white px-2 py-1 rounded text-xs w-full"
        >
          重新加载数据
        </button>
      </div>
    );
  };

  // 显示 Context 错误状态
  if (contextError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">系统配置错误</h3>
          <p className="text-gray-600 mb-4">{contextError}</p>
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

  // 显示会话加载状态
  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证用户身份...</p>
        </div>
      </div>
    );
  }

  // 显示未认证状态
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">需要登录</h3>
          <p className="text-gray-600 mb-4">请先登录以访问知识库功能</p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            立即登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部区域 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <svg className="h-8 w-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h1 className="text-2xl font-bold text-gray-900">知识库</h1>
              </div>
              <p className="text-gray-600">集中管理所有重要信息和知识点</p>
              
              {/* 快速统计 */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>共 {statistics.total} 条知识点</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  <span>技术文档: {statistics.technical}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span>产品文档: {statistics.product}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  <span>本周新增: {statistics.recent}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={handleCreateNew}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
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
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="搜索知识点标题、内容或标签..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              {localSearch && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* 视图切换和筛选 */}
            <div className="flex items-center space-x-4">
              {/* 筛选按钮 */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                disabled={isLoading}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                  showFilters 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                筛选
              </button>
              
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
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              
              {/* 搜索结果统计 */}
              <div className="text-sm text-gray-600">
                找到 {filteredKnowledgeItems.length} 条结果
                {searchQuery && (
                  <span>，搜索词: "{searchQuery}"</span>
                )}
              </div>
            </div>
          </div>

          {/* 筛选区域 */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <KnowledgeFilters />
            </div>
          )}
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
          ) : (
            <KnowledgeList 
              items={filteredKnowledgeItems} 
              onEdit={handleEdit}
              onViewDetail={handleViewDetail}
            />
          )}
        </div>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center">
            {toast.type === 'success' && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 调试信息 */}
      <DebugInfo />

      {/* 🔧 关键修复：修改编辑器模态框渲染条件 */}
      {isEditorOpen && (
        <KnowledgeEditor
          item={editingKnowledge}
          onSave={handleSaveEdit}
          onClose={handleCancelEdit}
        />
      )}

      {/* 详情查看模态框 */}
      {viewingDetail && (
        <KnowledgeDetail 
          item={viewingDetail}
          onClose={handleCloseDetail}
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