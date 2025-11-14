// src/pages/dashboard.js - 完整用户信息修复版本
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useUser } from '../contexts/UserContext';
import { KnowledgeProvider } from '../contexts/KnowledgeContext';
import Head from 'next/head';
import DashboardLayout from '../components/DashboardLayout';
import OverviewTab from '../components/OverviewTab';
import ProjectsTab from '../components/ProjectsTab';
import ChatTab from '../components/chat';
import KnowledgeTab from '../components/KnowledgeTab';
import SettingsTab from '../components/SettingsTab';

const CONFIG = {
  TABS: {
    OVERVIEW: 'overview',
    PROJECTS: 'projects', 
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
    title: '项目', 
    component: ProjectsTab, 
    icon: '📁',
    description: '管理您的项目'
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

export default function Dashboard({ session: serverSession }) {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const { user, loading: userLoading, logout, voiceEnabled, toggleVoice } = useUser();
  
  const [activeTab, setActiveTab] = useState(CONFIG.TABS.OVERVIEW);
  const [isClient, setIsClient] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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
    voiceEnabled, 
    toggleVoice, 
    isLoggingOut, 
    handleLogout, 
    isClient, 
    handleTabChange
  ]);

  const pageTitle = useMemo(() => {
    const tabTitle = TAB_CONFIG[activeTab]?.title || '控制台';
    return `${tabTitle} - AI项目平台`;
  }, [activeTab]);

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
        <meta name="description" content={TAB_CONFIG[activeTab]?.description || "AI项目平台控制面板"} />
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
          tabConfig={TAB_CONFIG}
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