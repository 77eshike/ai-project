import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '../hooks/useSession';

export default function DashboardClient() {
  const router = useRouter();
  const { data: session, loading, error, authenticated, user } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push('/auth/signin');
    }
  }, [loading, authenticated, router]);

  useEffect(() => {
    if (authenticated) {
      loadStats();
    }
  }, [authenticated]);

  const loadStats = async () => {
    try {
      // 这里可以加载仪表板统计数据
      const mockStats = {
        projects: 12,
        tasks: 45,
        completed: 28,
        members: 8
      };
      setStats(mockStats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">需要登录</h3>
          <p className="text-gray-600 mb-4">请先登录以访问仪表板</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            立即登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600 mt-2">欢迎回来，{user?.name || '用户'}！</p>
        </div>

        {/* 统计数据 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">项目总数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.projects}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">完成任务</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总任务数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.tasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">团队成员</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.members}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 标签页内容 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', name: '概览', icon: '📊' },
                { id: 'projects', name: '项目', icon: '📋' },
                { id: 'tasks', name: '任务', icon: '✅' },
                { id: 'analytics', name: '分析', icon: '📈' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">概览</h3>
                <p className="text-gray-600">这里是您的项目概览信息。</p>
              </div>
            )}
            
            {activeTab === 'projects' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">项目</h3>
                <p className="text-gray-600">管理您的项目。</p>
              </div>
            )}
            
            {activeTab === 'tasks' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">任务</h3>
                <p className="text-gray-600">查看和管理任务。</p>
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">分析</h3>
                <p className="text-gray-600">查看项目分析数据。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
