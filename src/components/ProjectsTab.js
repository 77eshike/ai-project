import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProjectsTab({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: '草稿' },
      PUBLISHED: { color: 'bg-blue-100 text-blue-800', label: '已发布' },
      RECRUITING: { color: 'bg-green-100 text-green-800', label: '招募中' },
      IN_PROGRESS: { color: 'bg-purple-100 text-purple-800', label: '进行中' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: '已完成' }
    };
    
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-600 mt-1">管理您的待定项目和正式项目</p>
        </div>
        <Link
          href="/dashboard?tab=chat"
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
        >
          💬 从聊天生成
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-900 text-lg">{project.title}</h3>
              {getStatusBadge(project.status)}
            </div>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {project.description || '暂无描述'}
            </p>
            
            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
              <span>创建者: {project.owner?.name}</span>
              <span>{new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
            
            <div className="flex space-x-2">
              <Link 
                href={`/projects/${project.id}`}
                className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                查看详情
              </Link>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
          <p className="text-gray-600 mb-4">开始创建您的第一个项目吧</p>
          <Link
            href="/dashboard?tab=chat"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            💬 从聊天生成项目
          </Link>
        </div>
      )}
    </div>
  );
}