// src/components/ProjectsTab.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { fetchProjects } from '../lib/api';
import ProjectStatusBadge from './ProjectStatusBadge'; // 导入新的状态组件

const CONFIG = {
  STATUS_CONFIG: {
    // 待定项目状态
    DRAFT: { color: 'bg-gray-100 text-gray-800', label: '草稿', icon: '📝' },
    IN_REVIEW: { color: 'bg-blue-100 text-blue-800', label: '评审中', icon: '👀' },
    FINALIZING: { color: 'bg-purple-100 text-purple-800', label: '定稿中', icon: '✍️' },
    
    // 正式项目状态
    RECRUITING: { color: 'bg-green-100 text-green-800', label: '招募中', icon: '👥' },
    IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', label: '进行中', icon: '🚀' },
    COMPLETED: { color: 'bg-green-100 text-green-800', label: '已完成', icon: '✅' },
    ARCHIVED: { color: 'bg-gray-100 text-gray-800', label: '已归档', icon: '📁' },
    FAILED: { color: 'bg-red-100 text-red-800', label: '已失败', icon: '❌' }
  },
  
  PROJECT_TYPE_CONFIG: {
    DRAFT_PROJECT: { color: 'bg-orange-100 text-orange-800', label: '待定项目' },
    STANDARD_PROJECT: { color: 'bg-blue-100 text-blue-800', label: '标准项目' },
    TEAM_PROJECT: { color: 'bg-purple-100 text-purple-800', label: '团队项目' },
    RESEARCH_PROJECT: { color: 'bg-green-100 text-green-800', label: '研究项目' }
  }
};

export default function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, draft, formal
  const router = useRouter();
  
  const { isAuthenticated, isLoading: sessionLoading, isReady } = useAuth();

  const loadProjects = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 开始加载项目列表...');

      const result = await fetchProjects();
      
      if (result === null) {
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
      if (error.message !== 'AUTH_REQUIRED_401') {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isReady]);

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    if (filter === 'draft') return project.projectType === 'DRAFT_PROJECT';
    if (filter === 'formal') return project.projectType !== 'DRAFT_PROJECT';
    return true;
  });

  // 监听认证状态变化
  useEffect(() => {
    if (isReady) {
      if (isAuthenticated) {
        loadProjects();
      } else {
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

  // 统计项目数量
  const draftCount = projects.filter(p => p.projectType === 'DRAFT_PROJECT').length;
  const formalCount = projects.filter(p => p.projectType !== 'DRAFT_PROJECT').length;

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-600 mt-2">
            {projects.length > 0 
              ? `共 ${projects.length} 个项目 (${draftCount} 个待定, ${formalCount} 个正式)` 
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

      {/* 项目筛选器 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部项目 ({projects.length})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'draft' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            待定项目 ({draftCount})
          </button>
          <button
            onClick={() => setFilter('formal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'formal' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            正式项目 ({formalCount})
          </button>
        </div>
      </div>

      {/* 项目网格 */}
      {filteredProjects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onUpdate={loadProjects} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-6xl mb-4">
            {filter === 'draft' ? '📝' : filter === 'formal' ? '🚀' : '📋'}
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {filter === 'draft' ? '暂无待定项目' : 
             filter === 'formal' ? '暂无正式项目' : '暂无项目'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'draft' ? '开始创建您的第一个待定项目吧' : 
             filter === 'formal' ? '将待定项目发布为正式项目或直接创建正式项目' : 
             '开始创建您的第一个项目吧'}
          </p>
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

function ProjectCard({ project, onUpdate }) {
  const router = useRouter();
  
  // 修复：使用 project.projectType 而不是 project.type
  const typeConfig = CONFIG.PROJECT_TYPE_CONFIG[project.projectType] || CONFIG.PROJECT_TYPE_CONFIG.STANDARD_PROJECT;

  const handleViewProject = () => {
    router.push(`/projects/${project.id}`);
  };

  // 快速操作：AI格式化
  const handleQuickFormat = async (e) => {
    e.stopPropagation();
    if (!project.id) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'STANDARD' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 快速格式化成功');
        if (onUpdate) onUpdate();
      } else {
        throw new Error(result.error || '格式化失败');
      }
    } catch (error) {
      console.error('❌ 快速格式化失败:', error);
      alert(`格式化失败: ${error.message}`);
    }
  };

  // 快速操作：发布项目
  const handleQuickPublish = async (e) => {
    e.stopPropagation();
    if (!project.id) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'STANDARD_PROJECT' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 快速发布成功');
        if (onUpdate) onUpdate();
      } else {
        throw new Error(result.error || '发布失败');
      }
    } catch (error) {
      console.error('❌ 快速发布失败:', error);
      alert(`发布失败: ${error.message}`);
    }
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
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
          </div>
        </div>
        
        {/* 使用新的状态组件 */}
        <div className="mb-3">
          <ProjectStatusBadge project={project} />
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
              👥 {project.memberCount || project._count?.projectMembers || 0}
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
          
          {/* 快速操作按钮 */}
          {project.projectType === 'DRAFT_PROJECT' && (
            <>
              {project.formattingStatus !== 'COMPLETED' && (
                <button
                  onClick={handleQuickFormat}
                  className="flex-1 bg-purple-50 text-purple-700 py-2 rounded-lg hover:bg-purple-100 transition-colors font-medium text-sm"
                  title="一键AI格式化"
                >
                  🚀 AI
                </button>
              )}
              {project.formattingStatus === 'COMPLETED' && (
                <button
                  onClick={handleQuickPublish}
                  className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
                  title="发布为正式项目"
                >
                  📢 发布
                </button>
              )}
            </>
          )}
        </div>
        
        {/* AI格式化状态提示 */}
        {project.projectType === 'DRAFT_PROJECT' && project.formattingStatus && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              {project.formattingStatus === 'PROCESSING' && '⏳ AI正在格式化...'}
              {project.formattingStatus === 'COMPLETED' && '✅ AI格式化已完成'}
              {project.formattingStatus === 'FAILED' && '❌ AI格式化失败'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}