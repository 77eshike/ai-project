// pages/auth/signup.js - 紧急修复版本（完全独立）
import { useState } from 'react';
import Link from 'next/link';

// 完全独立的布局，不依赖任何上下文
function SimpleAuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
        </div>
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function EmergencySignUp() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 基本验证
    if (!formData.username || !formData.email || !formData.password) {
      setError('请填写所有字段');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('密码确认不一致');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🚀 发送注册请求...');
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          acceptTerms: true
        }),
      });

      const data = await response.json();
      console.log('📨 注册响应:', data);

      if (!response.ok) {
        throw new Error(data.message || '注册失败');
      }

      if (data.success) {
        setSuccess(true);
        setError('');
        
        // 注册成功后直接跳转到登录页
        setTimeout(() => {
          window.location.href = '/auth/signin?message=registered&email=' + encodeURIComponent(formData.email);
        }, 2000);
      }
    } catch (err) {
      console.error('❌ 注册错误:', err);
      setError(err.message || '注册过程中出现错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SimpleAuthLayout 
      title="创建您的账户" 
      subtitle="加入我们，体验人工智能的强大功能"
    >
      {success ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">注册成功！</h3>
          <p className="text-gray-600">正在跳转到登录页面...</p>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名 *
            </label>
            <input
              name="username"
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入用户名"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              电子邮箱 *
            </label>
            <input
              name="email"
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入您的邮箱"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码 *
            </label>
            <input
              name="password"
              type="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入密码（至少6位）"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认密码 *
            </label>
            <input
              name="confirmPassword"
              type="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请再次输入密码"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? '注册中...' : '注册账户'}
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          已经有账户？{' '}
          <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800 font-semibold">
            立即登录
          </Link>
        </p>
      </div>
    </SimpleAuthLayout>
  );
}

// 🔧 关键修复：完全移除服务器端认证检查
export async function getServerSideProps() {
  return {
    props: {},
  };
}