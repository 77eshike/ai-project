// src/pages/dashboard.js - 修复版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../lib/auth';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../contexts/UserContext';
import { KnowledgeProvider } from '../contexts/KnowledgeContext';
import Head from 'next/head';
import DashboardLayout from '../components/DashboardLayout';
import OverviewTab from '../components/OverviewTab';
import ProjectsTab from '../components/ProjectsTab';
import ChatTab from '../components/chat';
import KnowledgeTab from '../components/KnowledgeTab';
import SettingsTab from '../components/SettingsTab';

// 🔧 修复：确保 TABS 常量正确定义
const TABS = {
  OVERVIEW: 'overview',
  PROJECTS: 'projects', 
  CHAT: 'chat',
  KNOWLEDGE: 'knowledge',
  SETTINGS: 'settings'
};

// 标签页配置
const TAB_CONFIG = {
  [TABS.OVERVIEW]: {
    title: '概览',
    component: OverviewTab,
    icon: '📊'
  },
  [TABS.PROJECTS]: {
    title: '项目',
    component: ProjectsTab,
    icon: '📁'
  },
  [TABS.CHAT]: {
    title: 'AI对话',
    component: ChatTab,
    icon: '💬'
  },
  [TABS.KNOWLEDGE]: {
    title: '知识库',
    component: KnowledgeTab,
    icon: '📚'
  },
  [TABS.SETTINGS]: {
    title: '设置',
    component: SettingsTab,
    icon: '⚙️'
  }
};

// 获取所有标签页值
const TAB_VALUES = Object.values(TABS);

// 加载组件
const LoadingSpinner = ({ message = '加载中...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  </div>
);

// 错误边界组件
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">出错了</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        重试
      </button>
    </div>
  </div>
);

export default function Dashboard({ session: serverSession, error: serverError }) {
  const router = useRouter();
  const { user, loading, logout, voiceEnabled, toggleVoice } = useUser();
  
  // 🔧 修复：使用字符串字面量初始化，避免 TABS 未定义
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState(serverError || null);

  // 🔧 新增：调试信息
  useEffect(() => {
    if (isClient) {
      console.log('🔍 Dashboard 调试信息:', {
        hasServerSession: !!serverSession,
        hasUserContext: !!user,
        activeTab,
        TABS: typeof TABS // 检查 TABS 是否定义
      });
    }
  }, [isClient, serverSession, user, activeTab]);

  // 修复水合错误：在客户端才设置状态
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 安全的标签页初始化 - 修复水合问题
  useEffect(() => {
    if (isClient && router.query.tab) {
      const tab = router.query.tab.toString();
      // 🔧 修复：使用 TAB_VALUES 检查有效性
      if (TAB_VALUES.includes(tab)) {
        console.log(`从路由参数设置标签页: ${tab}`);
        setActiveTab(tab);
      }
    }
  }, [router.query.tab, isClient]);

  // 错误边界重置
  const resetError = useCallback(() => {
    setError(null);
    router.reload();
  }, [router]);

  // 检测设备类型 - 修复水合问题
  useEffect(() => {
    if (isClient) {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      
      return () => {
        window.removeEventListener('resize', checkMobile);
      };
    }
  }, [isClient]);

  // 🔧 修复：用户认证检查逻辑
  useEffect(() => {
    if (isClient) {
      console.log('🔍 认证检查:', {
        hasServerSession: !!serverSession,
        hasUserContext: !!user,
        loading
      });

      // 如果服务器端有会话但客户端useUser没有用户数据，等待加载
      if (serverSession && !user && !loading) {
        console.log('🔄 服务器端有会话，等待useUser加载...');
        return;
      }

      // 如果都没有会话，重定向到登录
      if (!serverSession && !user && !loading) {
        console.log('❌ 无会话，重定向到登录页');
        router.push('/auth/signin');
      }
    }
  }, [user, loading, router, isClient, serverSession]);

  // 安全的登出处理
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      console.log('开始登出流程');
      await logout();
      router.push('/auth/signin');
    } catch (error) {
      console.error('登出错误:', error);
      setError(error);
      setIsLoggingOut(false);
    }
  }, [logout, router, isLoggingOut]);

  // 安全的标签页变化处理
  const handleTabChange = useCallback((tab) => {
    if (!isClient) return;
    
    try {
      // 🔧 修复：使用 TAB_VALUES 检查有效性
      if (!TAB_VALUES.includes(tab)) {
        console.warn(`无效的标签页: ${tab}`);
        return;
      }
      
      console.log(`切换标签页: ${activeTab} -> ${tab}`);
      setActiveTab(tab);
      
      // 使用 shallow routing 更新 URL
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, tab }
        },
        undefined,
        { 
          shallow: true,
          scroll: false
        }
      );
    } catch (err) {
      console.error('标签页切换错误:', err);
      setError(err);
    }
  }, [router, activeTab, isClient]);

  // 渲染当前活动标签页的内容 - 修复水合问题
  const renderActiveTab = useMemo(() => {
    if (error) {
      return <ErrorFallback error={error} resetErrorBoundary={resetError} />;
    }

    // 服务端渲染时返回简单的加载状态
    if (!isClient) {
      return (
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        </div>
      );
    }

    const tabConfig = TAB_CONFIG[activeTab];
    if (!tabConfig) {
      console.warn(`未找到标签页配置: ${activeTab}`);
      return <div className="p-6 text-center text-gray-500">标签页不存在</div>;
    }

    const TabComponent = tabConfig.component;
    
    try {
      switch (activeTab) {
        case TABS.CHAT:
          return <TabComponent voiceEnabled={voiceEnabled} toggleVoice={toggleVoice} />;
        case TABS.SETTINGS:
          return (
            <TabComponent 
              user={user} 
              isLoggingOut={isLoggingOut} 
              handleLogout={handleLogout} 
              voiceEnabled={voiceEnabled} 
              toggleVoice={toggleVoice} 
            />
          );
        default:
          return <TabComponent user={user} />;
      }
    } catch (err) {
      console.error(`渲染标签页 ${activeTab} 时出错:`, err);
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">组件加载失败</h3>
            <p className="text-red-600 text-sm mt-1">请刷新页面重试</p>
          </div>
        </div>
      );
    }
  }, [activeTab, user, voiceEnabled, toggleVoice, isLoggingOut, handleLogout, error, resetError, isClient]);

  // 页面标题
  const pageTitle = useMemo(() => {
    const tabTitle = TAB_CONFIG[activeTab]?.title || '控制台';
    return `AI项目平台 - ${tabTitle}`;
  }, [activeTab]);

  // 服务器错误处理
  if (serverError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚨</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">服务器错误</h2>
          <p className="text-gray-600 mb-4">{serverError}</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            返回登录页
          </button>
        </div>
      </div>
    );
  }

  // 🔧 修复：加载状态逻辑
  if (!isClient) {
    return <LoadingSpinner message="初始化客户端..." />;
  }

  // 🔧 修复：认证状态检查
  const isAuthenticated = serverSession || user;
  const stillLoading = loading && !user;

  if (stillLoading) {
    return <LoadingSpinner message="加载用户信息..." />;
  }

  if (!isAuthenticated) {
    return <LoadingSpinner message="验证用户身份..." />;
  }

  // 主错误边界
  if (error) {
    return <ErrorFallback error={error} resetErrorBoundary={resetError} />;
  }

  // 🔧 使用服务器端会话或客户端用户数据
  const currentUser = user || (serverSession ? { 
    id: serverSession.user.id,
    email: serverSession.user.email,
    name: serverSession.user.name
  } : null);

  if (!currentUser) {
    return <LoadingSpinner message="准备用户数据..." />;
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content="AI项目平台控制面板" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#3B82F6" />
      </Head>

      <KnowledgeProvider>
        <DashboardLayout 
          user={currentUser} 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          isMobile={isMobile}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          availableTabs={TABS}
          tabConfig={TAB_CONFIG}
        >
          {renderActiveTab}
        </DashboardLayout>
      </KnowledgeProvider>
    </>
  );
}

// 服务器端渲染
export async function getServerSideProps(context) {
  try {
    const session = await getServerSession(context.req, context.res, authOptions);

    console.log('🔍 仪表板服务器端会话检查:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    });

    if (!session?.user) {
      console.log('❌ 服务器端未认证，重定向到登录页');
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      };
    }

    console.log('✅ 服务器端认证通过，渲染仪表板');

    return {
      props: { 
        session: {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
          }
        }
      },
    };
  } catch (error) {
    console.error('❌ 仪表板服务器端错误:', error);
    
    return {
      props: { 
        session: null,
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器错误'
      },
    };
  }
}

Dashboard.displayName = 'DashboardPage';