// /pages/projects/[id].js - 修复版本
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';

const CONFIG = {
  RETRY_DELAY: 3000,
  MAX_RETRY_COUNT: 3,
  STATUS_COLORS: {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', label: '草稿' },
    PUBLISHED: { bg: 'bg-blue-100', text: 'text-blue-800', label: '已发布' },
    RECRUITING: { bg: 'bg-green-100', text: 'text-green-800', label: '招募中' },
    IN_PROGRESS: { bg: 'bg-purple-100', text: 'text-purple-800', label: '进行中' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: '已完成' }
  }
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status: sessionStatus } = useSession();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const isAuthenticated = !!session;
  const isLoadingSession = sessionStatus === 'loading';

  // 修复：安全的项目ID获取
  const projectId = id && typeof id === 'string' ? id.trim() : null;

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 加载项目详情:', projectId);

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      console.log('📨 API响应状态:', response.status);

      if (!response.ok) {
        let errorMessage = `加载失败 (${response.status})`;
        
        if (response.status === 401) {
          errorMessage = '请先登录';
          // 修复：避免立即重定向，让组件处理
        } else if (response.status === 404) {
          errorMessage = '项目不存在';
        } else if (response.status === 403) {
          errorMessage = '无权访问此项目';
        } else {
          errorMessage = '服务器错误，请稍后重试';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 项目加载成功');
        const projectData = data.data?.project || data.project;
        if (projectData) {
          setProject(projectData);
          setRetryCount(0);
        } else {
          throw new Error('项目数据格式错误');
        }
      } else {
        throw new Error(data.error || '加载项目失败');
      }

    } catch (error) {
      console.error('❌ 加载项目详情失败:', error);
      
      // 修复：只在网络错误时重试，不在认证错误时重试
      if (!error.message.includes('登录') && 
          !error.message.includes('无权') && 
          !error.message.includes('不存在') &&
          retryCount < CONFIG.MAX_RETRY_COUNT) {
        console.log(`🔄 准备重试 (${retryCount + 1}/${CONFIG.MAX_RETRY_COUNT})`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadProject();
        }, CONFIG.RETRY_DELAY);
        return;
      }
      
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, retryCount]);

  // 修复：改进的加载逻辑
  useEffect(() => {
    if (!projectId || isLoadingSession) return;

    if (!isAuthenticated) {
      setError('请先登录以查看项目详情');
      setLoading(false);
      return;
    }

    loadProject();
  }, [projectId, isLoadingSession, isAuthenticated, loadProject]);

  const handleLoginRedirect = () => {
    const currentPath = `/projects/${projectId}`;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryCount(0);
    loadProject();
  };

  // 修复：显示会话加载状态
  if (isLoadingSession) {
    return (
      <>
        <Head>
          <title>验证身份... - 项目详情</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">验证用户身份...</p>
          </div>
        </div>
      </>
    );
  }

  // 修复：显示未认证状态
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>需要登录 - 项目详情</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔐</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">需要登录</h3>
            <p className="text-gray-600 mb-4">请先登录以查看项目详情</p>
            <button
              onClick={handleLoginRedirect}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              立即登录
            </button>
          </div>
        </div>
      </>
    );
  }

  // 显示加载状态
  if (loading) {
    return (
      <>
        <Head>
          <title>加载中... - 项目详情</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载项目详情中...</p>
            <p className="text-sm text-gray-500 mt-2">项目ID: {projectId}</p>
            {retryCount > 0 && (
              <p className="text-sm text-orange-600 mt-1">
                第 {retryCount} 次重试...
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <>
        <Head>
          <title>加载失败 - 项目详情</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-3">
              {!error.includes('登录') && !error.includes('无权') && !error.includes('不存在') && (
                <button
                  onClick={handleRetry}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重新加载
                </button>
              )}
              <button
                onClick={() => router.push('/projects')}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                返回项目列表
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Head>
          <title>项目不存在 - 项目详情</title>
        </Head>
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
      </>
    );
  }

  const statusConfig = CONFIG.STATUS_COLORS[project.status] || CONFIG.STATUS_COLORS.DRAFT;

  return (
    <>
      <Head>
        <title>{project.title} - 项目详情</title>
        <meta name="description" content={project.description || '项目详情页面'} />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* 项目头部 */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                    {project.title}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-gray-600 text-lg">{project.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 项目内容 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </>
  );
}

// 修复：禁用预渲染，避免路由冲突
export async function getServerSideProps() {
  return {
    props: {},
  };
}