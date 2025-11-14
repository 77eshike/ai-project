import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function HomeClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 显示加载状态
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            欢迎使用 AI 项目管理平台
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            智能化的项目管理和协作平台，帮助您更高效地管理项目、团队和知识
          </p>
          
          {session ? (
            <div className="space-y-6">
              <p className="text-lg text-gray-700">
                欢迎回来，<span className="font-semibold">{session.user?.name || session.user?.email}</span>！
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/dashboard"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  进入仪表板
                </Link>
                <Link
                  href="/projects"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  查看项目
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-lg text-gray-700">
                立即登录开始使用所有功能
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/auth/signin"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  立即登录
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  注册账号
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 功能特性展示 */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-3">智能项目管理</h3>
            <p className="text-gray-600">
              基于AI的项目规划和进度跟踪，让项目管理更高效
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">💡</div>
            <h3 className="text-xl font-semibold mb-3">知识管理</h3>
            <p className="text-gray-600">
              集中管理项目知识，智能生成项目方案
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-3">团队协作</h3>
            <p className="text-gray-600">
              高效的团队协作工具，实时沟通和任务分配
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
