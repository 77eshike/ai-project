// src/pages/debug-session.js - 会话诊断页面
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function DebugSession() {
  const { data: session, status, update } = useSession();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [healthCheck, setHealthCheck] = useState(null);

  const checkSessionHealth = async () => {
    try {
      const response = await fetch('/api/auth/fix-session');
      const data = await response.json();
      setHealthCheck(data);
    } catch (error) {
      setHealthCheck({ error: error.message });
    }
  };

  useEffect(() => {
    checkSessionHealth();
  }, [session]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">会话诊断工具</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NextAuth 状态 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">NextAuth 状态</h2>
            <div className="space-y-2">
              <p><strong>状态:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  status === 'authenticated' ? 'bg-green-100 text-green-800' :
                  status === 'unauthenticated' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {status}
                </span>
              </p>
              <p><strong>用户ID:</strong> {session?.user?.id || '未认证'}</p>
              <p><strong>邮箱:</strong> {session?.user?.email || '未认证'}</p>
              <p><strong>姓名:</strong> {session?.user?.name || '未设置'}</p>
            </div>
          </div>

          {/* 健康检查 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">会话健康检查</h2>
            {healthCheck ? (
              <div className="space-y-2">
                <p><strong>状态:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    healthCheck.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {healthCheck.success ? '健康' : '异常'}
                  </span>
                </p>
                <p><strong>消息:</strong> {healthCheck.message}</p>
                {healthCheck.session && (
                  <>
                    <p><strong>用户ID:</strong> {healthCheck.session.userId}</p>
                    <p><strong>邮箱:</strong> {healthCheck.session.email}</p>
                  </>
                )}
                <button
                  onClick={checkSessionHealth}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  重新检查
                </button>
              </div>
            ) : (
              <p>检查中...</p>
            )}
          </div>

          {/* 操作面板 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">操作</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => update()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                刷新会话
              </button>
              <button
                onClick={checkSessionHealth}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                健康检查
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                前往 Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/auth/signin'}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                前往登录页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}