// src/pages/projects/[id].js - 完整修复版本
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';
import ProjectPublishButton from '../../components/ProjectPublishButton';
import FormattingPreview from '../../components/FormattingPreview';

const CONFIG = {
  RETRY_DELAY: 3000,
  MAX_RETRY_COUNT: 3,
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status: sessionStatus } = useSession();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const isAuthenticated = !!session;
  const isLoadingSession = sessionStatus === 'loading';

  // 🔧 关键修复：验证项目ID
  const projectId = useMemo(() => {
    if (!id) return null;
    
    // 检查id是否为有效的项目ID（不是'new'或其他特殊值）
    if (id === 'new' || typeof id !== 'string' || id.trim().length === 0) {
      console.error('❌ 无效的项目ID:', id);
      return null;
    }
    
    return id.trim();
  }, [id]);

  const loadProject = useCallback(async () => {
    // 🔧 关键修复：检查项目ID有效性
    if (!projectId) {
      setError('无效的项目ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 加载项目详情:', { projectId });

      // 🔧 关键修复：使用正确的API端点
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
        } else if (response.status === 404) {
          errorMessage = '项目不存在';
        } else if (response.status === 403) {
          errorMessage = '无权访问此项目';
        } else if (response.status === 500) {
          // 尝试获取更详细的错误信息
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || '服务器错误，请稍后重试';
          } catch {
            errorMessage = '服务器错误，请稍后重试';
          }
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

  useEffect(() => {
    if (!projectId || isLoadingSession) return;

    if (!isAuthenticated) {
      setError('请先登录以查看项目详情');
      setLoading(false);
      return;
    }

    loadProject();
  }, [projectId, isLoadingSession, isAuthenticated, loadProject]);

  const handleFormattingComplete = (updatedProject) => {
    setProject(updatedProject);
  };

  const handlePublishComplete = (updatedProject) => {
    setProject(updatedProject);
    // 发布成功后刷新页面数据
    loadProject();
  };

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

  const isOwner = session?.user?.id === project?.authorId;
  const canEdit = isOwner || project?.collaborators?.some(
    collab => collab.userId === session?.user?.id && collab.role === 'EDITOR'
  );

  // 在渲染前检查项目ID有效性
  if (!projectId && id) {
    return (
      <>
        <Head>
          <title>无效的项目ID - 项目详情</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">无效的项目ID</h3>
            <p className="text-gray-600 mb-4">无法加载项目详情，项目ID格式不正确。</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/projects')}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回项目列表
              </button>
              <button
                onClick={() => router.push('/projects/new')}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                创建新项目
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 显示会话加载状态
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

  // 显示未认证状态
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
                  <ProjectStatusBadge project={project} />
                </div>
                <p className="text-gray-600 text-lg">{project.description}</p>
              </div>
            </div>

            {/* AI操作按钮组 */}
            {canEdit && project.projectType === 'DRAFT_PROJECT' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">项目工作流</h3>
                    <p className="text-blue-700 text-sm">
                      {project.formattingStatus === 'NOT_STARTED' && '开始AI格式化来完善项目内容'}
                      {project.formattingStatus === 'PROCESSING' && 'AI正在格式化项目内容...'}
                      {project.formattingStatus === 'COMPLETED' && 'AI格式化已完成，可以发布为正式项目'}
                      {project.formattingStatus === 'FAILED' && 'AI格式化失败，请重试'}
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    {/* 格式化状态指示 */}
                    <div className="flex items-center text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        project.formattingStatus === 'COMPLETED' ? 'bg-green-500' :
                        project.formattingStatus === 'PROCESSING' ? 'bg-yellow-500' :
                        project.formattingStatus === 'FAILED' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                      {project.formattingStatus === 'COMPLETED' && '已格式化'}
                      {project.formattingStatus === 'PROCESSING' && '格式化中...'}
                      {project.formattingStatus === 'FAILED' && '格式化失败'}
                      {project.formattingStatus === 'NOT_STARTED' && '未格式化'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                项目概览
              </button>
              <button
                onClick={() => setActiveTab('formatting')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'formatting'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                AI格式化
              </button>
              <button
                onClick={() => setActiveTab('discussion')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'discussion'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                讨论区
              </button>
              {canEdit && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  项目设置
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* 标签页内容 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 项目基本信息 */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">项目详情</h2>
                <div className="prose max-w-none">
                  {project.aiFormattedContent ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: project.aiFormattedContent }} 
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">{project.content}</pre>
                  )}
                </div>
              </div>

              {/* 发布按钮区域 */}
              {canEdit && project.projectType === 'DRAFT_PROJECT' && project.formattingStatus === 'COMPLETED' && (
                <ProjectPublishButton 
                  project={project}
                  onPublishComplete={handlePublishComplete}
                />
              )}
            </div>
          )}

          {activeTab === 'formatting' && (
            <FormattingPreview 
              project={project}
              onFormattingComplete={handleFormattingComplete}
            />
          )}

          {activeTab === 'discussion' && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">项目讨论</h2>
              {project.allowPublicComments ? (
                <div>
                  <p className="text-gray-600">评论功能开发中...</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>此项目暂未开启公开评论功能</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && canEdit && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">项目设置</h2>
              <p className="text-gray-600">项目设置功能开发中...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}