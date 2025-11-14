import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// 🔧 配置常量
const CONFIG = {
  LOADING_DELAY: 300, // 防止加载闪烁
  REDIRECT_DELAY: 100,
  FALLBACK_TIMEOUT: 5000 // 备用方案超时
};

// 🔧 优化的加载组件
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">加载用户资料...</p>
      <p className="text-sm text-gray-500 mt-2">请稍候</p>
    </div>
  </div>
);

// 🔧 错误回退组件
const ErrorFallback = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-red-600 text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
      <p className="text-gray-600 mb-4">
        {error?.message || '加载用户资料时出现错误'}
      </p>
      <div className="space-y-3">
        <button
          onClick={onRetry}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重新加载
        </button>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          刷新页面
        </button>
      </div>
    </div>
  </div>
);

// 🔧 使用动态导入禁用服务端渲染
const ProfileClient = dynamic(
  () => import('@/components/ProfileClient').then((mod) => {
    console.log('✅ ProfileClient 组件加载成功');
    return mod;
  }).catch((error) => {
    console.error('❌ ProfileClient 组件加载失败:', error);
    // 返回一个错误回退组件
    return () => <ErrorFallback error={error} />;
  }),
  { 
    ssr: false,
    loading: () => <LoadingFallback />,
    // 🔧 添加超时处理
    timeout: CONFIG.FALLBACK_TIMEOUT
  }
);

// 🔧 认证保护 Hook
function useAuthGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        console.log('🔐 用户未认证，重定向到登录页');
        setTimeout(() => {
          router.replace('/auth/signin?callbackUrl=' + encodeURIComponent(router.asPath));
        }, CONFIG.REDIRECT_DELAY);
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [status, router]);

  return { isChecking, isAuthenticated: status === 'authenticated', session };
}

// 🔧 页面包装器组件
function ProfilePageWrapper() {
  const { isChecking, isAuthenticated, session } = useAuthGuard();
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  // 🔧 处理组件加载错误
  const handleComponentError = (error) => {
    console.error('ProfileClient 组件错误:', error);
    setError(error);
    setHasError(true);
  };

  // 🔧 重试加载
  const handleRetry = () => {
    setHasError(false);
    setError(null);
    // 强制重新加载组件
    window.location.reload();
  };

  // 🔧 显示加载状态
  if (isChecking) {
    return (
      <>
        <Head>
          <title>加载中... - AI项目平台</title>
        </Head>
        <LoadingFallback />
      </>
    );
  }

  // 🔧 显示错误状态
  if (hasError) {
    return (
      <>
        <Head>
          <title>加载失败 - AI项目平台</title>
        </Head>
        <ErrorFallback error={error} onRetry={handleRetry} />
      </>
    );
  }

  // 🔧 未认证状态（虽然应该已经被重定向）
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>未授权 - AI项目平台</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">重定向到登录页...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>用户资料 - AI项目平台</title>
        <meta name="description" content="查看和编辑您的个人资料信息" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      {/* 🔧 使用错误边界包装动态组件 */}
      <div className="profile-page-container">
        <ProfileClient 
          onError={handleComponentError}
          user={session?.user}
        />
      </div>
    </>
  );
}

export default function ProfilePage() {
  return <ProfilePageWrapper />;
}

// 🔧 优化的服务器端处理
export async function getServerSideProps(context) {
  // 添加一些延迟来模拟服务器端处理
  await new Promise(resolve => setTimeout(resolve, 10));

  try {
    // 可以在这里添加服务器端的认证检查
    // 但注意：由于组件是动态导入的，服务器端不会渲染实际内容
    
    return {
      props: {
        // 可以传递一些初始数据
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('ProfilePage 服务器端错误:', error);
    
    // 即使出错也返回空 props，让客户端处理
    return {
      props: {
        error: '服务器端处理失败',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// 🔧 添加页面配置
ProfilePage.suppressFirstRenderFlicker = true;
ProfilePage.getLayout = (page) => page;

// 🔧 类型定义（如果使用 TypeScript）
/**
 * @typedef {Object} ProfilePageProps
 * @property {string} [timestamp]
 * @property {string} [error]
 */

/**
 * @param {ProfilePageProps} props
 */