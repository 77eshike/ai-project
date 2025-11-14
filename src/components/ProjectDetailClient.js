// src/components/ProjectDetailClient.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth'; // 修复导入路径
import { fetchProjectDetail } from '../lib/api'; // 修复导入路径

export default function ProjectDetailClient({ projectId }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: sessionLoading, isReady } = useAuth();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProject = useCallback(async () => {
    if (!projectId || !isReady || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      console.log('📡 加载项目详情...', { projectId });

      const result = await fetchProjectDetail(projectId);
      
      if (result === null) {
        // 认证失败，已重定向
        return;
      }

      if (result.success) {
        const projectData = result.data?.project || result.project;
        if (projectData) {
          setProject(projectData);
        } else {
          throw new Error('项目数据格式错误');
        }
      } else {
        throw new Error(result.error || '加载项目失败');
      }
    } catch (error) {
      console.error('❌ 加载项目详情失败:', error);
      if (error.message !== 'AUTH_REQUIRED_401') {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, isAuthenticated, isReady]);

  useEffect(() => {
    if (isReady) {
      if (isAuthenticated) {
        loadProject();
      } else {
        setLoading(false);
        setError('请先登录以查看项目详情');
      }
    }
  }, [isAuthenticated, isReady, loadProject]);

  // 显示会话加载状态
  if (sessionLoading) {
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
          <p className="text-gray-600 mb-4">请先登录以查看项目详情</p>
          <button
            onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(router.asPath)}`)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载项目详情中...</p>
          <p className="text-sm text-gray-500 mt-2">项目ID: {projectId}</p>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadProject}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
            <button
              onClick={() => router.push('/projects')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              返回项目列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">项目不存在</h3>
          <button
            onClick={() => router.push('/projects')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回项目列表
          </button>
        </div>
      </div>
    );
  }

  // 返回项目详情页面的 JSX（简化的版本）
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 项目头部和内容 */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {project.title}
          </h1>
          <p className="text-gray-600 text-lg mt-2">{project.description}</p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 项目详情内容 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">项目详情</h2>
          <div className="prose max-w-none">
            {project.content ? (
              <div className="whitespace-pre-wrap">{project.content}</div>
            ) : (
              <p className="text-gray-500 italic">暂无项目详情内容</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}