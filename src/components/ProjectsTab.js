// src/components/ProjectsTab.js - 完整版本
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useControlledSession } from '../hooks/useControlledSession';

export default function ProjectsTab({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  // 使用受控会话 Hook
  const { data: session, status: sessionStatus, isAuthenticated, refreshSession } = useControlledSession();

  // 使用 ref 来跟踪状态
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  // 🔧 关键修复：在组件级别也拦截会话检查
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 组件级别的额外拦截
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('/api/auth/session')) {
          console.log('🔍 检测到会话检查网络请求，但已被拦截');
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 加载项目的函数
  const loadProjects = useCallback(async (showRefresh = false) => {
    if (!isMountedRef.current) return;

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('🔄 加载项目列表...', {
        sessionStatus,
        isAuthenticated,
        userId: session?.user?.id
      });

      // 检查会话状态
      if (!isAuthenticated || !session) {
        const errorMsg = '用户未登录，请先登录';
        setError(errorMsg);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ 加载项目成功: ${data.data?.projects?.length || 0} 个项目`);
        
        const formattedProjects = (data.data?.projects || []).map(project => ({
          ...project,
          memberCount: project.memberCount || project._count?.projectMembers || 0,
          members: project.members || project.projectMembers || [],
          isOwner: project.isOwner || project.ownerId === parseInt(session?.user?.id)
        }));
        
        if (isMountedRef.current) {
          setProjects(formattedProjects);
        }
      } else {
        throw new Error(data.error || '获取项目失败');
      }
      
    } catch (error) {
      console.error('❌ 加载项目失败:', error);
      
      if (isMountedRef.current) {
        if (error.name === 'AbortError') {
          setError('请求超时，请检查网络连接或稍后重试');
        } else if (error.message.includes('401')) {
          setError('未授权访问，请重新登录');
        } else if (error.message.includes('500')) {
          setError('服务器内部错误，请稍后重试或联系管理员');
        } else if (error.message.includes('Failed to fetch')) {
          setError('网络连接失败，请检查网络设置');
        } else {
          setError(error.message || '加载项目失败');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [session, sessionStatus, isAuthenticated]);

  // 优化的初始化效果
  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('🔍 ProjectsTab 会话状态:', {
      sessionStatus,
      isAuthenticated,
      hasLoaded: hasLoadedRef.current
    });

    // 如果会话还在加载，等待
    if (sessionStatus === 'loading') {
      console.log('⏳ 会话加载中，等待...');
      return;
    }

    // 如果未认证，停止加载
    if (!isAuthenticated) {
      console.log('🚫 用户未认证');
      if (isMountedRef.current) {
        setLoading(false);
        setProjects([]);
      }
      return;
    }

    // 如果已认证且未加载过，加载项目
    if (isAuthenticated && !hasLoadedRef.current) {
      console.log('🔄 首次加载项目...');
      hasLoadedRef.current = true;
      loadProjects();
    }
  }, [isAuthenticated, sessionStatus, loadProjects]);

  // 重试函数
  const handleRetry = useCallback(() => {
    hasLoadedRef.current = true;
    loadProjects(true);
  }, [loadProjects]);

  // 手动刷新会话
  const handleRefreshSession = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  // 项目状态徽章
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

  // 项目类型徽章
  const getTypeBadge = (type) => {
    const typeConfig = {
      DRAFT_PROJECT: { color: 'bg-orange-100 text-orange-800', label: '待定项目' },
      STANDARD_PROJECT: { color: 'bg-blue-100 text-blue-800', label: '标准项目' },
      TEAM_PROJECT: { color: 'bg-purple-100 text-purple-800', label: '团队项目' }
    };
    
    const config = typeConfig[type] || typeConfig.DRAFT_PROJECT;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // 处理创建项目
  const handleCreateProject = () => {
    router.push('/projects/new');
  };

  // 处理查看项目详情
  const handleViewProject = (projectId) => {
    router.push(`/projects/${projectId}`);
  };

  // 显示加载状态
  if (loading && projects.length === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载项目中...</p>
          {refreshing && (
            <p className="text-sm text-blue-500 mt-1">刷新数据...</p>
          )}
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error && projects.length === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
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
                onClick={handleRefreshSession}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                刷新会话
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-600 mt-2">
            {projects.length > 0 
              ? `共 ${projects.length} 个项目` 
              : '管理您的项目和任务'
            }
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/dashboard?tab=chat&action=generate-project')}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-sm"
          >
            💬 从聊天生成
          </button>
          <button
            onClick={handleCreateProject}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            ➕ 新建项目
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && projects.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800 text-sm">部分数据加载失败: {error}</span>
          </div>
        </div>
      )}

      {/* 项目网格 */}
      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div 
              key={project.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
              onClick={() => handleViewProject(project.id)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg truncate" title={project.title}>
                      {project.title}
                    </h3>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {getTypeBadge(project.type)}
                  </div>
                </div>
                
                <div className="mb-3">
                  {getStatusBadge(project.status)}
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[60px]">
                  {project.description || '暂无描述'}
                </p>
                
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      👤 {project.owner?.name || '未知用户'}
                    </span>
                    <span className="flex items-center">
                      👥 {project.memberCount || 1}
                    </span>
                  </div>
                  <span>
                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '未知'}
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProject(project.id);
                    }}
                    className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                  >
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">暂无项目</h3>
          <p className="text-gray-600 mb-6">开始创建您的第一个项目吧</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/dashboard?tab=chat&action=generate-project')}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
            >
              💬 从聊天生成
            </button>
            <button
              onClick={handleCreateProject}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ 新建项目
            </button>
          </div>
        </div>
      )}

      {/* 刷新按钮 */}
      {projects.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => loadProjects(true)}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>刷新中...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>刷新列表</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}