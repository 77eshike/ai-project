import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export default function ProjectsClient() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'authenticated') {
      loadProjects();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      setError('请先登录以查看项目');
    }
  }, [sessionStatus]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = `HTTP错误! 状态: ${response.status}`;
        
        if (response.status === 401) {
          errorMessage = '请先登录';
        } else if (response.status === 403) {
          errorMessage = '无权访问项目';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success) {
        const projectsData = data.data?.projects || data.projects || [];
        setProjects(projectsData);
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: '草稿', icon: '📝' },
      PUBLISHED: { color: 'bg-blue-100 text-blue-800', label: '已发布', icon: '📢' },
      RECRUITING: { color: 'bg-green-100 text-green-800', label: '招募中', icon: '👥' },
      IN_PROGRESS: { color: 'bg-purple-100 text-purple-800', label: '进行中', icon: '🚀' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: '已完成', icon: '✅' }
    };
    
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const handleRetry = () => {
    loadProjects();
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

  // 显示加载状态
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-600 mt-2">
              {projects.length > 0 
                ? `共 ${projects.length} 个项目` 
                : '管理您的项目'
              }
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/projects/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              ➕ 新建项目
            </Link>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{project.title}</h3>
                  {getStatusBadge(project.status)}
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {project.description || '暂无描述'}
                </p>
                <button
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  查看详情
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">暂无项目</h3>
            <p className="text-gray-600 mb-6">开始创建您的第一个项目吧</p>
            <Link
              href="/projects/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ 新建项目
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
