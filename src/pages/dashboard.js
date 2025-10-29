// src/pages/dashboard.js - 应用安全钩子的版本
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../lib/auth';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import SafeDashboardLayout from '../components/SafeDashboardLayout';
import DashboardErrorBoundary from '../components/DashboardErrorBoundary';
import OverviewTab from '../components/OverviewTab';
import ProjectsTab from '../components/ProjectsTab';
import ChatTab from '../components/chat';
import KnowledgeTab from '../components/KnowledgeTab';
import SettingsTab from '../components/SettingsTab';

// 导入安全钩子 - 替换原来的热修复
import { useDashboardSafety, useSafeData, useSafeUser } from '../hooks/useDashboardSafety';

// 标签页配置
const TABS = {
  OVERVIEW: 'overview',
  PROJECTS: 'projects', 
  CHAT: 'chat',
  KNOWLEDGE: 'knowledge',
  SETTINGS: 'settings'
};

const TAB_CONFIG = {
  [TABS.OVERVIEW]: {
    title: '概览',
    component: OverviewTab,
    icon: '📊',
    description: '查看项目统计和活动概览'
  },
  [TABS.PROJECTS]: {
    title: '项目',
    component: ProjectsTab,
    icon: '📁',
    description: '管理您的项目和任务'
  },
  [TABS.CHAT]: {
    title: 'AI对话',
    component: ChatTab,
    icon: '💬',
    description: '与AI助手进行智能对话'
  },
  [TABS.KNOWLEDGE]: {
    title: '知识库',
    component: KnowledgeTab,
    icon: '📚',
    description: '管理知识点和学习资料'
  },
  [TABS.SETTINGS]: {
    title: '设置',
    component: SettingsTab,
    icon: '⚙️',
    description: '账户和偏好设置'
  }
};

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

// 错误显示组件
const ErrorDisplay = ({ title, message, onRetry, onBack }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="space-y-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            重试
          </button>
        )}
        {onBack && (
          <button
            onClick={onBack}
            className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            返回安全页
          </button>
        )}
      </div>
    </div>
  </div>
);

export default function Dashboard({ session: serverSession, error: serverError }) {
  const router = useRouter();
  const { data: clientSession, status } = useSession();
  
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState(serverError || null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 🔧 应用安全保护钩子 - 替换原来的热修复
  useDashboardSafety();
  const { safeGet, safeCall } = useSafeData();

  // 安全的客户端检测
  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => setIsInitialized(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 安全的标签页初始化 - 使用安全数据访问
  useEffect(() => {
    if (isClient && router.query.tab) {
      const tab = safeGet(router, 'query.tab', '');
      if (TAB_VALUES.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [router.query.tab, isClient, safeGet]);

  // 响应式检测 - 使用安全调用
  useEffect(() => {
    if (isClient) {
      const checkMobile = () => {
        setIsMobile(safeGet(window, 'innerWidth', 1024) < 768);
      };
      
      safeCall(checkMobile);
      safeCall(() => window.addEventListener('resize', checkMobile));
      
      return () => {
        safeCall(() => window.removeEventListener('resize', checkMobile));
      };
    }
  }, [isClient, safeCall, safeGet]);

  // 认证状态管理 - 使用安全数据访问
  useEffect(() => {
    if (!isClient || !isInitialized) return;

    console.log('🔐 认证状态检查:', {
      status,
      hasServerSession: !!serverSession,
      hasClientSession: !!clientSession
    });

    // 使用安全数据访问检查认证状态
    const isUnauthenticated = status === 'unauthenticated';
    const hasNoSession = !serverSession && !safeGet(clientSession, 'user');
    
    if (isUnauthenticated && hasNoSession) {
      console.log('🔐 未认证用户，重定向到登录页');
      safeCall(() => router.replace('/auth/signin'));
      return;
    }

    // 安全地处理错误
    if (error) {
      console.warn('⚠️ 仪表板存在错误:', error);
    }
  }, [status, router, isClient, serverSession, clientSession, error, isInitialized, safeCall, safeGet]);

  // 修复退出登录处理函数 - 使用安全调用
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    console.log('🚪 开始退出登录...');
    
    try {
      // 安全地动态导入
      const { signOut } = await import('next-auth/react');
      console.log('🔧 调用 NextAuth signOut...');
      
      await safeCall(signOut, { 
        callbackUrl: '/auth/signin?logout=success',
        redirect: true 
      });
      
    } catch (error) {
      console.error('❌ NextAuth 退出失败:', error);
      
      // 安全地备用方案
      if (typeof window !== 'undefined') {
        safeCall(() => {
          window.location.href = '/auth/signin?logout=success&direct=true';
        });
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, safeCall]);

  // 标签页切换 - 使用安全调用
  const handleTabChange = useCallback((tab) => {
    if (!isClient || !TAB_VALUES.includes(tab)) return;
    
    setActiveTab(tab);
    
    // 安全地更新URL
    safeCall(() => {
      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('tab', tab);
        window.history.replaceState({}, '', newUrl);
      } catch (error) {
        console.warn('🔧 URL更新失败:', error);
      }
    });
  }, [isClient, safeCall]);

  // 🔧 使用安全用户钩子获取用户数据
  const currentUser = useSafeUser(
    useMemo(() => {
      try {
        const session = clientSession || serverSession;
        return safeGet(session, 'user', null);
      } catch (err) {
        console.error('❌ 获取用户数据时出错:', err);
        return null;
      }
    }, [clientSession, serverSession, safeGet])
  );

  // 渲染当前标签页 - 使用安全数据访问
  const renderActiveTab = useMemo(() => {
    if (!isClient || !isInitialized) {
      return (
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">初始化中...</p>
          </div>
        </div>
      );
    }

    const tabConfig = safeGet(TAB_CONFIG, activeTab, null);
    if (!tabConfig) {
      return (
        <div className="p-6 text-center text-gray-500">
          <div className="text-4xl mb-4">❓</div>
          <h3 className="text-lg font-medium mb-2">标签页不存在</h3>
          <p>请选择有效的标签页</p>
          <button
            onClick={() => handleTabChange(TABS.OVERVIEW)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            返回概览
          </button>
        </div>
      );
    }

    const TabComponent = safeGet(tabConfig, 'component', null);
    
    if (!TabComponent) {
      return (
        <div className="p-6 text-center text-red-500">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-medium mb-2">组件加载失败</h3>
          <p>无法加载标签页组件</p>
        </div>
      );
    }

    try {
      // 为不同标签页传递适当的props - 使用安全数据
      const tabProps = {
        user: currentUser,
        onTabChange: handleTabChange
      };

      // 特定标签页的props
      switch (activeTab) {
        case TABS.CHAT:
          return <TabComponent {...tabProps} />;
        case TABS.SETTINGS:
          return (
            <TabComponent 
              {...tabProps}
              isLoggingOut={isLoggingOut} 
              onLogout={handleLogout} 
            />
          );
        default:
          return <TabComponent {...tabProps} />;
      }
    } catch (err) {
      console.error(`❌ 渲染标签页 ${activeTab} 时出错:`, err);
      
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="text-red-400 text-2xl mr-3">❌</div>
              <div>
                <h3 className="text-red-800 font-semibold mb-2">组件加载失败</h3>
                <p className="text-red-700 mb-4">
                  {safeGet(err, 'message', '加载组件时发生未知错误')}
                </p>
                <div className="space-x-3">
                  <button
                    onClick={() => safeCall(() => window.location.reload())}
                    className="bg-red-100 text-red-800 px-4 py-2 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    刷新页面
                  </button>
                  <button
                    onClick={() => handleTabChange(TABS.OVERVIEW)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    返回概览
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }, [activeTab, isLoggingOut, handleLogout, isClient, handleTabChange, currentUser, isInitialized, safeGet, safeCall]);

  // 页面标题 - 使用安全数据访问
  const pageTitle = useMemo(() => {
    const tabTitle = safeGet(TAB_CONFIG, `${activeTab}.title`, '控制台');
    return `${tabTitle} - AI项目平台`;
  }, [activeTab, safeGet]);

  // 处理重试 - 使用安全调用
  const handleRetry = useCallback(() => {
    safeCall(() => window.location.reload());
  }, [safeCall]);

  // 处理返回安全页 - 使用安全调用
  const handleBackToSafety = useCallback(() => {
    safeCall(() => router.push('/auth/signin'));
  }, [router, safeCall]);

  // 服务器错误处理
  if (serverError) {
    return (
      <ErrorDisplay
        title="服务器错误"
        message={serverError}
        onRetry={handleRetry}
        onBack={handleBackToSafety}
      />
    );
  }

  // 客户端加载状态
  if (!isClient || !isInitialized) {
    return <LoadingSpinner message="初始化客户端环境..." />;
  }

  // 认证状态检查 - 使用安全数据访问
  const isAuthenticated = safeGet(currentUser, 'isAuthenticated', false) && safeGet(currentUser, 'id', '') !== 'unknown';
  const stillLoading = status === 'loading';

  if (stillLoading && !serverSession) {
    return <LoadingSpinner message="验证用户会话..." />;
  }

  if (!isAuthenticated && status === 'unauthenticated') {
    return (
      <ErrorDisplay
        title="认证失败"
        message="无法验证您的登录状态，请重新登录"
        onRetry={handleRetry}
        onBack={handleBackToSafety}
      />
    );
  }

  // 主渲染
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content="AI项目平台控制面板" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#3B82F6" />
      </Head>

      <DashboardErrorBoundary>
        <SafeDashboardLayout 
          user={currentUser} 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          isMobile={isMobile}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        >
          {renderActiveTab}
        </SafeDashboardLayout>
      </DashboardErrorBoundary>
    </>
  );
}

// 服务器端渲染 - 增强错误处理
export async function getServerSideProps(context) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);
  
  console.log(`🔍 [${requestId}] 开始服务器端渲染仪表板`);
  
  try {
    // 使用缓存的会话获取
    const { getCachedServerSession } = await import('../lib/sessionWrapper');
    const session = await getCachedServerSession(context.req, context.res);

    if (!session?.user) {
      console.log(`🚫 [${requestId}] 无有效会话，重定向到登录页`);
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      };
    }

    // 验证会话数据完整性
    if (!session.user.id || !session.user.email) {
      console.warn(`⚠️ [${requestId}] 会话数据不完整:`, session.user);
      return {
        redirect: {
          destination: '/auth/signin?error=invalid_session',
          permanent: false,
        },
      };
    }

    // 确保返回的用户数据包含所有必需字段
    const safeSession = {
      user: {
        id: session.user.id.toString() || 'unknown',
        name: session.user.name || '用户',
        email: session.user.email || '',
        image: session.user.image || null,
        role: session.user.role || 'USER'
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] 服务器端渲染完成 (${duration}ms)`);

    return {
      props: { 
        session: safeSession
      },
    };
  } catch (error) {
    console.error(`❌ [${requestId}] 仪表板服务器端错误:`, error);
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `开发模式错误: ${error.message}`
      : '服务器暂时不可用，请稍后重试';
    
    return {
      props: { 
        session: null,
        error: errorMessage
      },
    };
  }
}

// 设置显示名称
Dashboard.displayName = 'DashboardPage';