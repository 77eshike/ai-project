// /opt/ai-project/src/pages/projects/index.js - 修复版本
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 20
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });

  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // 修复：改进的重定向逻辑
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      console.log('🔐 用户未认证，重定向到登录页');
      const currentPath = router.asPath;
      // 添加延迟避免重复重定向
      setTimeout(() => {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
      }, 100);
    }
  }, [sessionStatus, router]);

  // 修复：优化加载逻辑，避免重复加载
  useEffect(() => {
    // 只有在会话加载完成且已认证时才加载项目
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'authenticated') {
      loadProjects();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      setError('请先登录以查看项目');
    }
  }, [filters, sessionStatus]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 加载项目列表...', { 
        sessionStatus, 
        isAuthenticated: !!session,
        filters,
        searchTerm
      });

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      // 修复：添加搜索参数
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const response = await fetch(`/api/projects?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📨 API响应状态:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP错误! 状态: ${response.status}`;
        
        if (response.status === 401) {
          errorMessage = '请先登录';
          // 修复：避免立即重定向，让组件处理
        } else if (response.status === 403) {
          errorMessage = '无权访问项目';
        } else if (response.status === 500) {
          errorMessage = '服务器内部错误，请稍后重试';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      console.log('📊 API响应数据:', data);

      if (data.success) {
        console.log('✅ 项目加载成功');
        const projectsData = data.data?.projects || data.projects || [];
        const total = data.data?.pagination?.total || data.total || projectsData.length;
        
        // 修复：改进分页逻辑
        if (filters.page === 1) {
          setProjects(projectsData);
        } else {
          setProjects(prev => [...prev, ...projectsData]);
        }
        
        setPagination(prev => ({
          ...prev,
          total,
          hasMore: (filters.page * filters.limit) < total
        }));
        
        if (projectsData.length === 0) {
          console.log('📭 项目列表为空');
        }
      } else {
        throw new Error(data.error || '加载项目失败');
      }
    } catch (error) {
      console.error('❌ 加载项目失败:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value, 
      page: 1
    }));
  };

  // 修复：改进搜索处理
  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleRetry = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
    loadProjects();
  };

  const loadMore = () => {
    setFilters(prev => ({
      ...prev,
      page: prev.page + 1
    }));
  };

  const handleCreateFromChat = () => {
    router.push('/dashboard?tab=chat&action=generate-project');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: '草稿', icon: '📝' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: '待审核', icon: '⏳' },
      PUBLISHED: { color: 'bg-blue-100 text-blue-800', label: '已发布', icon: '📢' },
      RECRUITING: { color: 'bg-green-100 text-green-800', label: '招募中', icon: '👥' },
      IN_PROGRESS: { color: 'bg-purple-100 text-purple-800', label: '进行中', icon: '🚀' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: '已完成', icon: '✅' },
      FAILED: { color: 'bg-red-100 text-red-800', label: '已失败', icon: '❌' }
    };
    
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      DRAFT_PROJECT: { color: 'bg-orange-100 text-orange-800', label: '待定项目' },
      STANDARD_PROJECT: { color: 'bg-blue-100 text-blue-800', label: '标准项目' },
      TEAM_PROJECT: { color: 'bg-purple-100 text-purple-800', label: '团队项目' },
      GENERAL: { color: 'bg-gray-100 text-gray-800', label: '常规项目' }
    };
    
    const config = typeConfig[type] || typeConfig.GENERAL;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // 显示会话加载状态
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证用户身份...</p>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error && projects.length === 0 && sessionStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">需要登录</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(router.asPath)}`)}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              立即登录
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 显示加载状态
  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载项目中...</p>
          {sessionStatus === 'loading' && (
            <p className="text-sm text-blue-500 mt-1">验证用户会话...</p>
          )}
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
            {error.includes('登录') && (
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                立即登录
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题和操作 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-600 mt-2">
              {projects.length > 0 
                ? `共 ${pagination.total} 个项目，显示 ${projects.length} 个` 
                : '管理您的待定项目和正式项目'
              }
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCreateFromChat}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-sm"
            >
              💬 从聊天生成
            </button>
            <Link
              href="/projects/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              ➕ 新建项目
            </Link>
          </div>
        </div>

        {/* 错误提示 */}
        {error && projects.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-800 text-sm">部分数据加载失败: {error}</span>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* 搜索框 */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">搜索项目</label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="输入项目名称或描述..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  搜索
                </button>
              </form>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目类型</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部类型</option>
                <option value="DRAFT_PROJECT">待定项目</option>
                <option value="STANDARD_PROJECT">标准项目</option>
                <option value="TEAM_PROJECT">团队项目</option>
                <option value="GENERAL">常规项目</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目状态</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部状态</option>
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="RECRUITING">招募中</option>
                <option value="IN_PROGRESS">进行中</option>
                <option value="COMPLETED">已完成</option>
              </select>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setFilters({ type: '', status: '', page: 1, limit: 20 });
                  setSearchTerm('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        </div>

        {/* 项目网格 */}
        {projects.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onUpdate={loadProjects}
                  getStatusBadge={getStatusBadge}
                  getTypeBadge={getTypeBadge}
                />
              ))}
            </div>

            {/* 加载更多 */}
            {pagination.hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">暂无项目</h3>
            <p className="text-gray-600 mb-6">开始创建您的第一个项目吧</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleCreateFromChat}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
              >
                💬 从聊天生成
              </button>
              <Link
                href="/projects/new"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ➕ 新建项目
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 项目卡片组件 - 修复版本
function ProjectCard({ project, onUpdate, getStatusBadge, getTypeBadge }) {
  const router = useRouter();

  // 修复：完整的项目操作处理
  const handleAction = async (action, e) => {
    e.stopPropagation();
    
    try {
      let method = 'PUT';
      let body = {};

      switch (action) {
        case 'publish':
          body = { status: 'PUBLISHED' };
          break;
        case 'archive':
          body = { status: 'ARCHIVED' };
          break;
        case 'delete':
          method = 'DELETE';
          break;
        default:
          return;
      }

      const response = await fetch(`/api/projects/${project.id}`, {
        method,
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        ...(method !== 'DELETE' && { body: JSON.stringify(body) })
      });
      
      const data = await response.json();
      if (data.success) {
        onUpdate();
        console.log(`✅ 项目${action}成功`);
      } else {
        throw new Error(data.error || `操作失败`);
      }
    } catch (error) {
      console.error(`项目${action}失败:`, error);
      alert(`操作失败: ${error.message}`);
    }
  };

  const handleViewDetails = () => {
    router.push(`/projects/${project.id}`);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    router.push(`/projects/${project.id}/edit`);
  };

  // 修复：改进的成员计数显示
  const memberCount = project.memberCount || project._count?.projectMembers || 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
         onClick={handleViewDetails}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-600 transition-colors" 
                title={project.title}>
              {project.title}
            </h3>
          </div>
          <div className="flex space-x-1 ml-2 flex-shrink-0">
            {getTypeBadge(project.type)}
          </div>
        </div>
        
        <div className="mb-3">
          {getStatusBadge(project.status)}
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[60px]">
          {project.description || '暂无项目描述'}
        </p>
        
        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span className="flex items-center" title="项目负责人">
              👤 {project.owner?.name || '未知用户'}
            </span>
            <span className="flex items-center" title="团队成员数">
              👥 {memberCount}
            </span>
          </div>
          <span title="创建时间">
            {project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '未知'}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleViewDetails}
            className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
          >
            查看详情
          </button>
          
          {project.status === 'DRAFT' && (
            <button 
              onClick={(e) => handleAction('publish', e)}
              className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
            >
              发布
            </button>
          )}
          
          {project.status === 'PUBLISHED' && (
            <button 
              onClick={(e) => handleAction('archive', e)}
              className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              归档
            </button>
          )}
        </div>
        
        {/* 编辑按钮 */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleEdit}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-1 rounded hover:bg-gray-50 transition-colors"
          >
            编辑项目
          </button>
        </div>
      </div>
    </div>
  );
}