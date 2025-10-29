// pages/profile.js
import { useSession } from '../hooks/useSession';

export default function ProfilePage() {
  const { data, loading, error, authenticated, user } = useSession();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">加载失败: {error}</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <button 
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">个人资料</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-4">
          {user.image && (
            <img 
              src={user.image} 
              alt={user.name} 
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          登录状态: {data.expires ? `有效期至 ${new Date(data.expires).toLocaleString()}` : '未知'}
        </div>
      </div>
    </div>
  );
}