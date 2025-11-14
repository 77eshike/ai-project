import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function ProfileClient() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (sessionStatus === 'authenticated') {
      loadUserData();
    }
  }, [sessionStatus, router]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('获取用户资料失败');
      }

      const data = await response.json();
      
      if (data.success) {
        setUserData(data.data);
      } else {
        throw new Error(data.error || '获取用户资料失败');
      }
    } catch (error) {
      console.error('加载用户资料失败:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 显示加载状态
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载用户资料中...</p>
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
              onClick={loadUserData}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">用户资料</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">您的个人信息和账户设置</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">姓名</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {userData?.name || session?.user?.name || '未设置'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">邮箱</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {userData?.email || session?.user?.email || '未设置'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">用户ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {userData?.id || session?.user?.id || '未知'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">注册时间</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('zh-CN') : '未知'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 其他用户信息部分 */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">账户统计</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">创建的项目</span>
                <span className="text-sm font-medium">{userData?.projectCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">参与的项目</span>
                <span className="text-sm font-medium">{userData?.joinedProjectCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">知识点</span>
                <span className="text-sm font-medium">{userData?.knowledgeCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/projects/new')}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                创建新项目
              </button>
              <button
                onClick={() => router.push('/knowledge')}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                管理知识点
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                账户设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}