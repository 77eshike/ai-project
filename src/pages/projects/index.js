import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 20
  });
  
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, [filters]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/projects?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
      } else {
        console.error('加载项目失败:', data.error);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
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
    return type === 'DRAFT_PROJECT' 
      ? <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">待定项目</span>
      : <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">正式项目</span>;
  };

  const handleCreateFromChat = () => {
    router.push('/chat');
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载项目中...</p>
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
            <p className="text-gray-600 mt-2">管理您的待定项目和正式项目</p>
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

        {/* 筛选器 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目类型</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部类型</option>
                <option value="DRAFT_PROJECT">待定项目</option>
                <option value="FORMAL_PROJECT">正式项目</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
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
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ type: '', status: '', page: 1, limit: 20 })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重置筛选
              </button>
            </div>
          </div>
        </div>

        {/* 项目网格 */}
        {projects.length > 0 ? (
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

// 项目卡片组件
function ProjectCard({ project, onUpdate, getStatusBadge, getTypeBadge }) {
  const router = useRouter();

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' })
      });
      
      const data = await response.json();
      if (data.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('发布项目失败:', error);
    }
  };

  const handleViewDetails = () => {
    router.push(`/projects/${project.id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
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
              👤 {project.owner.name}
            </span>
            <span className="flex items-center">
              👥 {project._count?.members || 1}
            </span>
          </div>
          <span>
            {new Date(project.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleViewDetails}
            className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium"
          >
            查看详情
          </button>
          {project.status === 'DRAFT' && (
            <button 
              onClick={handlePublish}
              className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              发布
            </button>
          )}
        </div>
      </div>
    </div>
  );
}