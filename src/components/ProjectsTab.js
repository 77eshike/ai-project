// src/components/ProjectsTab.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth'; // 修复导入路径
import { fetchProjects } from '../lib/api'; // 修复导入路径

const CONFIG = {
  STATUS_CONFIG: {
    DRAFT: { color: 'bg-gray-100 text-gray-800', label: '草稿', icon: '📝' },
    PUBLISHED: { color: 'bg-blue-100 text-blue-800', label: '已发布', icon: '📢' },
    RECRUITING: { color: 'bg-green-100 text-green-800', label: '招募中', icon: '👥' },
    IN_PROGRESS: { color: 'bg-purple-100 text-purple-800', label: '进行中', icon: '🚀' },
    COMPLETED: { color: 'bg-green-100 text-green-800', label: '已完成', icon: '✅' }
  }
};

export default function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  const { isAuthenticated, isLoading: sessionLoading, isReady } = useAuth();

  const loadProjects = useCallback(async () => {
    // 如果会话未准备好或未认证，不加载项目
    if (!isReady || !isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 开始加载项目列表...');

      const result = await fetchProjects();
      
      if (result === null) {
        // 认证失败，已重定向
        return;
      }

      if (result.success) {
        const projectsData = result.data?.projects || [];
        console.log(`✅ 成功加载 ${projectsData.length} 个项目`);
        setProjects(projectsData);
      } else {
        throw new Error(result.error || '获取项目失败');
      }
    } catch (error) {
      console.error('❌ 加载项目失败:', error);
      // 如果不是认证错误，显示错误信息
      if (error.message !== 'AUTH_REQUIRED_401') {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isReady]);

  // 监听认证状态变化
  useEffect(() => {
    if (isReady) {
      if (isAuthenticated) {
        loadProjects();
      } else {
        // 未认证，停止加载
        setLoading(false);
        setError('请先登录以查看项目');
      }
    }
  }, [isAuthenticated, isReady, loadProjects]);

  // 显示会话加载状态
  if (sessionLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
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
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">需要登录</h3>
          <p className="text-gray-600 mb-4">请先登录以查看项目</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            立即登录
          </button>
        </div>
      </div>
    );
  }

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载项目中...</p>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadProjects}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-600 mt-2">
            {projects.length > 0 
              ? `共 ${projects.length} 个项目` 
              : '管理您的项目和任务'
            }
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/dashboard?tab=chat&action=generate-project')}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-sm text-sm font-medium"
          >
            💬 从聊天生成
          </button>
          <button
            onClick={() => router.push('/projects/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            ➕ 新建项目
          </button>
        </div>
      </div>

      {/* 项目网格 */}
      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">暂无项目</h3>
          <p className="text-gray-600 mb-6">开始创建您的第一个项目吧</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push('/dashboard?tab=chat&action=generate-project')}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all font-medium"
            >
              💬 从聊天生成
            </button>
            <button
              onClick={() => router.push('/projects/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ➕ 新建项目
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }) {
  const router = useRouter();
  const statusConfig = CONFIG.STATUS_CONFIG[project.status] || CONFIG.STATUS_CONFIG.DRAFT;

  const handleViewProject = () => {
    router.push(`/projects/${project.id}`);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
      onClick={handleViewProject}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-600 transition-colors" 
              title={project.title}
            >
              {project.title}
            </h3>
          </div>
          <div className="flex space-x-1 ml-2 flex-shrink-0">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800`}>
              {project.type === 'DRAFT_PROJECT' ? '待定项目' : 
               project.type === 'STANDARD_PROJECT' ? '标准项目' : 
               project.type === 'TEAM_PROJECT' ? '团队项目' : '常规项目'}
            </span>
          </div>
        </div>
        
        <div className="mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <span className="mr-1">{statusConfig.icon}</span>
            {statusConfig.label}
          </span>
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
              👥 {project.memberCount || 1}
            </span>
          </div>
          <span title="创建时间">
            {project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '未知'}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleViewProject}
            className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
          >
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}