// src/pages/dashboard.js - 优化版本（集成项目公共看板）
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useUser } from '../contexts/UserContext';
import { KnowledgeProvider } from '../contexts/KnowledgeContext';
import Head from 'next/head';
import DashboardLayout from '../components/DashboardLayout';
import OverviewTab from '../components/OverviewTab';
import ProjectsTab from '../components/ProjectsTab';
import ProjectPublicBoard from '../components/ProjectPublicBoard'; // 新增公共看板组件
import ChatTab from '../components/chat';
import KnowledgeTab from '../components/KnowledgeTab';
import SettingsTab from '../components/SettingsTab';

const CONFIG = {
  TABS: {
    OVERVIEW: 'overview',
    PROJECTS: 'projects', 
    PROJECTS_PUBLIC: 'projects-public', // 新增公共看板标签
    CHAT: 'chat',
    KNOWLEDGE: 'knowledge',
    SETTINGS: 'settings'
  },
  MOBILE_BREAKPOINT: 768,
  LOADING_DELAY: 300
};

const TAB_CONFIG = {
  [CONFIG.TABS.OVERVIEW]: { 
    title: '概览', 
    component: OverviewTab, 
    icon: '📊',
    description: '查看项目概览和统计信息'
  },
  [CONFIG.TABS.PROJECTS]: { 
    title: '我的项目', 
    component: ProjectsTab, 
    icon: '📁',
    description: '管理您的个人项目'
  },
  [CONFIG.TABS.PROJECTS_PUBLIC]: { 
    title: '项目看板', 
    component: ProjectPublicBoard, 
    icon: '📋',
    description: '浏览社区项目和参与机会'
  },
  [CONFIG.TABS.CHAT]: { 
    title: 'AI对话', 
    component: ChatTab, 
    icon: '💬',
    description: '与AI助手对话'
  },
  [CONFIG.TABS.KNOWLEDGE]: { 
    title: '知识库', 
    component: KnowledgeTab, 
    icon: '📚',
    description: '管理知识库内容'
  },
  [CONFIG.TABS.SETTINGS]: { 
    title: '设置', 
    component: SettingsTab, 
    icon: '⚙️',
    description: '账户和偏好设置'
  }
};

const TAB_VALUES = Object.values(CONFIG.TABS);

const LoadingSpinner = ({ message = '加载中...', subMessage = '' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
        {subMessage && (
          <p className="text-sm text-gray-500 mt-2">{subMessage}</p>
        )}
      </div>
    </div>
  );
};

const useDeviceDetection = (isClient) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!isClient) return;

    const checkMobile = () => {
      const mobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
      setIsMobile(mobile);
    };

    checkMobile();
    
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, 250);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isClient]);

  return isMobile;
};

// 新增：项目统计信息组件
const ProjectStats = ({ projects = [] }) => {
  const stats = useMemo(() => {
    const draftProjects = projects.filter(p => p.projectType === 'DRAFT_PROJECT');
    const formalProjects = projects.filter(p => p.projectType !== 'DRAFT_PROJECT');
    const recruitingProjects = formalProjects.filter(p => p.status === 'RECRUITING');
    const inProgressProjects = formalProjects.filter(p => p.status === 'IN_PROGRESS');

    return {
      total: projects.length,
      draft: draftProjects.length,
      formal: formalProjects.length,
      recruiting: recruitingProjects.length,
      inProgress: inProgressProjects.length
    };
  }, [projects]);

  if (stats.total === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
        <div className="text-sm text-gray-600">总项目</div>
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-orange-600">{stats.draft}</div>
        <div className="text-sm text-gray-600">待定项目</div>
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-green-600">{stats.formal}</div>
        <div className="text-sm text-gray-600">正式项目</div>
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-purple-600">{stats.recruiting}</div>
        <div className="text-sm text-gray-600">招募中</div>
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-indigo-600">{stats.inProgress}</div>
        <div className="text-sm text-gray-600">进行中</div>
      </div>
    </div>
  );
};

// 新增：快速操作面板
const QuickActions = ({ user, onNavigate }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('/projects/new')}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
        >
          <div className="text-2xl mb-2">🚀</div>
          <span className="font-medium text-gray-900">新建项目</span>
          <span className="text-sm text-gray-600 mt-1">创建新项目</span>
        </button>
        
        <button
          onClick={() => onNavigate('/dashboard?tab=chat&action=generate-project')}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all"
        >
          <div className="text-2xl mb-2">💬</div>
          <span className="font-medium text-gray-900">AI生成</span>
          <span className="text-sm text-gray-600 mt-1">从对话生成项目</span>
        </button>
        
        <button
          onClick={() => onNavigate(`/dashboard?tab=${CONFIG.TABS.PROJECTS_PUBLIC}`)}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all"
        >
          <div className="text-2xl mb-2">👥</div>
          <span className="font-medium text-gray-900">浏览项目</span>
          <span className="text-sm text-gray-600 mt-1">查看社区项目</span>
        </button>
        
        <button
          onClick={() => onNavigate('/knowledge/new')}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all"
        >
          <div className="text-2xl mb-2">📚</div>
          <span className="font-medium text-gray-900">添加知识</span>
          <span className="text-sm text-gray-600 mt-1">丰富知识库</span>
        </button>
      </div>
    </div>
  );
};

export default function Dashboard({ session: serverSession }) {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const { user, loading: userLoading, logout, voiceEnabled, toggleVoice } = useUser();
  
  const [activeTab, setActiveTab] = useState(CONFIG.TABS.OVERVIEW);
  const [isClient, setIsClient] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [projects, setProjects] = useState([]); // 新增：项目数据状态

  // 🔧 客户端检测
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 🔧 关键修复：简化的认证检查
  useEffect(() => {
    if (!isClient) return;

    console.log('🔐 Dashboard 认证状态:', { 
      status, 
      hasSession: !!session,
      authChecked,
      sessionUser: session?.user
    });

    switch (status) {
      case 'authenticated':
        if (session?.user?.id) {
          console.log('✅ 有效的认证会话，用户信息:', {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
            status: session.user.status,
            createdAt: session.user.createdAt
          });
          setAuthChecked(true);
          setRedirecting(false);
          
          // 加载项目数据用于统计
          loadProjectsForStats();
        }
        break;

      case 'unauthenticated':
        console.log('❌ 未认证状态，准备重定向');
        if (!redirecting) {
          setRedirecting(true);
          setTimeout(() => {
            router.push('/auth/signin');
          }, 500);
        }
        break;

      case 'loading':
        console.log('⏳ 认证状态加载中...');
        break;
    }
  }, [status, session, router, isClient, redirecting, updateSession]);

  // 新增：加载项目数据用于统计
  const loadProjectsForStats = useCallback(async () => {
    try {
      const response = await fetch('/api/projects?limit=100');
      if (response.ok) {
        const data = await response.json();
        const projectsData = data.data?.projects || data.projects || [];
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('加载项目统计失败:', error);
    }
  }, []);

  // 🔧 关键修复：完整的用户数据
  const currentUser = useMemo(() => {
    const rawUser = session?.user || user || serverSession?.user;
    
    if (!rawUser) {
      console.log('❌ 没有用户数据');
      return null;
    }
    
    if (!rawUser.id || !rawUser.email) {
      console.warn('❌ 用户数据不完整:', rawUser);
      return null;
    }
    
    // 🔧 构建完整的用户对象，确保所有字段都有安全的值
    const completeUser = {
      id: rawUser.id?.toString() || '',
      email: rawUser.email || '',
      name: rawUser.name || '用户',
      image: rawUser.image || null,
      role: rawUser.role || 'USER',
      status: rawUser.status || 'ACTIVE',
      createdAt: rawUser.createdAt || new Date().toISOString(),
      updatedAt: rawUser.updatedAt || new Date().toISOString(),
      lastLoginAt: rawUser.lastLoginAt || null,
      emailVerified: rawUser.emailVerified || null,
      preferences: rawUser.preferences || {}
    };
    
    console.log('👤 构建完整用户对象:', {
      id: completeUser.id,
      email: completeUser.email,
      role: completeUser.role,
      status: completeUser.status,
      hasCreatedAt: !!completeUser.createdAt,
      hasLastLoginAt: !!completeUser.lastLoginAt
    });
    
    return completeUser;
  }, [session, user, serverSession]);

  const isMobile = useDeviceDetection(isClient);

  // 🔧 标签页初始化
  useEffect(() => {
    if (isClient && router.query.tab) {
      const tab = router.query.tab.toString();
      if (TAB_VALUES.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [router.query.tab, isClient]);

  // 🔧 安全的标签页切换
  const handleTabChange = useCallback((tab) => {
    if (!isClient || !TAB_VALUES.includes(tab)) return;
    
    setActiveTab(tab);
    
    const newQuery = { ...router.query, tab };
    router.replace(
      { pathname: router.pathname, query: newQuery },
      undefined,
      { shallow: true, scroll: false }
    ).catch(error => {
      console.error('标签页切换错误:', error);
    });
  }, [router, isClient]);

  // 🔧 安全的登出处理
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      console.log('🚪 开始登出流程');
      
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      await logout();
      
      console.log('✅ 登出成功');
      
      setTimeout(() => {
        window.location.href = '/auth/signin?logout=success';
      }, 500);
      
    } catch (error) {
      console.error('登出错误:', error);
      setIsLoggingOut(false);
      
      setTimeout(() => {
        window.location.href = '/auth/signin?logout=error';
      }, 500);
    }
  }, [logout, isLoggingOut]);

  // 新增：导航处理
  const handleNavigate = useCallback((path) => {
    if (path.startsWith('/')) {
      router.push(path);
    } else {
      const [pathname, query] = path.split('?');
      const searchParams = new URLSearchParams(query);
      const queryObj = {};
      for (const [key, value] of searchParams.entries()) {
        queryObj[key] = value;
      }
      router.push({ pathname, query: queryObj });
    }
  }, [router]);

  // 🔧 渲染当前活动标签页
  const renderActiveTab = useMemo(() => {
    if (!isClient) {
      return (
        <div className="min-h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const tabConfig = TAB_CONFIG[activeTab];
    if (!tabConfig) {
      return (
        <div className="p-6 text-center text-gray-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">标签页不存在</h3>
          <button
            onClick={() => handleTabChange(CONFIG.TABS.OVERVIEW)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回概览
          </button>
        </div>
      );
    }

    const TabComponent = tabConfig.component;
    
    let tabProps = { user: currentUser };
    
    switch (activeTab) {
      case CONFIG.TABS.OVERVIEW:
        tabProps = { 
          ...tabProps, 
          projects, // 传递项目数据用于概览显示
          onNavigate: handleNavigate 
        };
        break;
      case CONFIG.TABS.CHAT:
        tabProps = { ...tabProps, voiceEnabled, toggleVoice };
        break;
      case CONFIG.TABS.SETTINGS:
        tabProps = { 
          ...tabProps, 
          isLoggingOut, 
          handleLogout, 
          voiceEnabled, 
          toggleVoice 
        };
        break;
      default:
        break;
    }

    return <TabComponent {...tabProps} />;
  }, [
    activeTab, 
    currentUser,
    projects,
    voiceEnabled, 
    toggleVoice, 
    isLoggingOut, 
    handleLogout, 
    isClient, 
    handleTabChange,
    handleNavigate
  ]);

  const pageTitle = useMemo(() => {
    const tabTitle = TAB_CONFIG[activeTab]?.title || '控制台';
    return `${tabTitle} - AI项目平台`;
  }, [activeTab]);

  // 新增：增强的概览标签页内容
  const EnhancedOverviewTab = useMemo(() => {
    return function EnhancedOverview({ user, projects, onNavigate }) {
      return (
        <div className="space-y-6">
          {/* 欢迎横幅 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">
              欢迎回来，{user?.name || '用户'}！
            </h1>
            <p className="opacity-90">
              今天有什么新的想法或项目要开始吗？
            </p>
          </div>

          {/* 快速操作 */}
          <QuickActions user={user} onNavigate={onNavigate} />

          {/* 项目统计 */}
          <ProjectStats projects={projects} />

          {/* 主要内容 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 最近项目 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📋</span>
                最近项目
              </h3>
              {projects.slice(0, 5).map(project => (
                <div key={project.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <h4 className="font-medium text-gray-900">{project.title}</h4>
                    <p className="text-sm text-gray-600">{project.description}</p>
                  </div>
                  <button
                    onClick={() => onNavigate(`/projects/${project.id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    查看
                  </button>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无项目</p>
                  <button
                    onClick={() => onNavigate('/projects/new')}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    创建第一个项目
                  </button>
                </div>
              )}
            </div>

            {/* 系统状态 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🚀</span>
                AI功能状态
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">项目格式化</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">可用</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">智能发布</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">可用</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">知识库集成</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">可用</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">团队协作</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">测试中</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
  }, []);

  // 替换概览标签页组件
  const actualTabConfig = useMemo(() => {
    const config = { ...TAB_CONFIG };
    if (activeTab === CONFIG.TABS.OVERVIEW) {
      config[CONFIG.TABS.OVERVIEW].component = EnhancedOverviewTab;
    }
    return config;
  }, [activeTab, EnhancedOverviewTab]);

  if (!isClient || status === 'loading' || userLoading) {
    return (
      <LoadingSpinner 
        message="正在验证您的身份..." 
        subMessage={`状态: ${status}`}
      />
    );
  }

  if (status === 'unauthenticated' && !redirecting) {
    return (
      <LoadingSpinner 
        message="正在验证用户身份..." 
        subMessage="即将重定向到登录页面"
      />
    );
  }

  if (!currentUser && authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-yellow-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">用户数据加载失败</h3>
          <p className="text-gray-600 mb-4">无法加载用户信息，请重新登录</p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新登录
          </button>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <LoadingSpinner 
        message="重定向中..." 
        subMessage="正在跳转到登录页面"
      />
    );
  }

  console.log('🎉 渲染 Dashboard 主界面', {
    user: currentUser?.name || '未知用户',
    userId: currentUser?.id,
    activeTab,
    isMobile,
    status
  });

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={actualTabConfig[activeTab]?.description || "AI项目平台控制面板"} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <KnowledgeProvider>
        <DashboardLayout 
          user={currentUser} 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          isMobile={isMobile}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          availableTabs={CONFIG.TABS}
          tabConfig={actualTabConfig}
        >
          {renderActiveTab}
        </DashboardLayout>
      </KnowledgeProvider>
    </>
  );
}

export async function getServerSideProps(context) {
  try {
    const { getServerSession } = await import('next-auth/next');
    const authModule = await import('../lib/auth');
    const authOptions = authModule.authOptions || authModule.default;
    
    const session = await getServerSession(context.req, context.res, authOptions);

    // 🔧 关键修复：在服务器端也返回完整的用户信息
    const safeSession = session ? {
      user: {
        id: session.user?.id?.toString() || '',
        email: session.user?.email || '',
        name: session.user?.name || '用户',
        image: session.user?.image || null,
        role: session.user?.role || 'USER',
        status: session.user?.status || 'ACTIVE',
        createdAt: session.user?.createdAt || new Date().toISOString(),
        updatedAt: session.user?.updatedAt || new Date().toISOString(),
        lastLoginAt: session.user?.lastLoginAt || null,
        emailVerified: session.user?.emailVerified || null,
        preferences: session.user?.preferences || {}
      }
    } : null;

    console.log('🔍 服务器端会话信息:', {
      hasSession: !!safeSession,
      userId: safeSession?.user?.id,
      userEmail: safeSession?.user?.email,
      userRole: safeSession?.user?.role
    });

    return {
      props: { 
        session: safeSession
      },
    };
  } catch (error) {
    console.error('Dashboard 服务器端错误:', error);
    return {
      props: { session: null },
    };
  }
}