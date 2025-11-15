// src/pages/projects/new.js - 修复版本
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';

export default function NewProjectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    projectType: 'DRAFT_PROJECT'
  });

  // 会话状态处理
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证用户身份...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // 使用更友好的重定向
    const currentPath = '/projects/new';
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">重定向到登录页面...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('📨 提交项目数据:', formData);

      const response = await fetch('/api/projects/new', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      console.log('📨 API响应:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || `HTTP错误! 状态: ${response.status}`);
      }

      if (result.success) {
        console.log('✅ 项目创建成功，重定向到项目详情');
        router.push(`/projects/${result.data.project.id}`);
      } else {
        throw new Error(result.error || '创建项目失败');
      }
    } catch (error) {
      console.error('❌ 创建项目失败:', error);
      setError(error.message || '创建项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <>
      <Head>
        <title>创建新项目 - AI项目平台</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">创建新项目</h1>
            
            {/* 错误显示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-800">{error}</p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="text-red-800 hover:text-red-900 text-sm font-medium"
                  >
                    重试
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  项目标题 *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入项目标题"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">最多200个字符</p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  项目描述
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="简要描述您的项目"
                />
              </div>

              <div>
                <label htmlFor="projectType" className="block text-sm font-medium text-gray-700 mb-2">
                  项目类型
                </label>
                <select
                  id="projectType"
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DRAFT_PROJECT">待定项目</option>
                  <option value="STANDARD_PROJECT">标准项目</option>
                  <option value="TEAM_PROJECT">团队项目</option>
                  <option value="RESEARCH_PROJECT">研究项目</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.projectType === 'DRAFT_PROJECT' && '待定项目：需要AI格式化和完善后才能发布'}
                  {formData.projectType === 'STANDARD_PROJECT' && '标准项目：完整的项目规划和执行'}
                  {formData.projectType === 'TEAM_PROJECT' && '团队项目：需要多人协作完成'}
                  {formData.projectType === 'RESEARCH_PROJECT' && '研究项目：学术研究或技术探索'}
                </p>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  项目内容
                </label>
                <textarea
                  id="content"
                  name="content"
                  rows={6}
                  value={formData.content}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="详细描述您的项目需求、目标、预期成果等信息..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  对于待定项目，AI将帮助您完善和格式化这些内容
                </p>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      创建中...
                    </>
                  ) : (
                    '创建项目'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}