// pages/auth/signup.js - 优化版本
import { useState, useCallback, useEffect } from 'react';
import AuthLayout from '../../components/Layout/AuthLayout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ErrorBoundary from '../../components/ErrorBoundary';

// 密码强度计算器
const usePasswordStrength = (password) => {
  return useCallback(() => {
    if (!password) return { strength: 0, label: '未输入', color: 'bg-gray-300' };
    
    let strength = 0;
    const checks = [
      password.length >= 6,
      password.length >= 8,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    
    strength = checks.filter(Boolean).length;
    
    const labels = ['非常弱', '弱', '一般', '强', '非常强'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-600'];
    
    return {
      strength,
      label: labels[strength - 1] || '非常弱',
      color: colors[strength - 1] || 'bg-red-500'
    };
  }, [password]);
};

export default function SignUp() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [successMessage, setSuccessMessage] = useState('');
  
  const router = useRouter();
  const passwordStrength = usePasswordStrength(formData.password)();

  // Hydration 处理
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    }
  }, []);

  // 表单字段处理
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除错误当用户开始输入时
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  }, [error, successMessage]);

  const handleBlur = useCallback((e) => {
    setTouched(prev => ({
      ...prev,
      [e.target.name]: true
    }));
  }, []);

  // 表单验证
  const validateForm = useCallback(() => {
    const errors = [];

    if (!formData.username.trim()) {
      errors.push('用户名不能为空');
    } else if (formData.username.length < 2) {
      errors.push('用户名至少需要2个字符');
    }

    if (!formData.email.trim()) {
      errors.push('邮箱地址不能为空');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('请输入有效的邮箱地址');
    }

    if (!formData.password) {
      errors.push('密码不能为空');
    } else if (formData.password.length < 6) {
      errors.push('密码至少需要6位');
    }

    if (!formData.confirmPassword) {
      errors.push('请确认密码');
    } else if (formData.password !== formData.confirmPassword) {
      errors.push('密码确认不一致');
    }

    if (!agreedToTerms) {
      errors.push('请同意服务条款和隐私政策');
    }

    return errors;
  }, [formData, agreedToTerms]);

  // 安全的路由跳转
  const safeRouterPush = useCallback((url) => {
    if (!isClient) return;
    
    const currentPath = window.location.pathname;
    const targetPath = url.split('?')[0];
    
    if (currentPath === targetPath) {
      console.warn('阻止导航到相同URL:', url);
      return;
    }
    
    router.push(url);
  }, [router, isClient]);

  // 提交处理
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 客户端验证
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 发送注册请求:', { 
        email: formData.email,
        username: formData.username 
      });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }),
      });

      const data = await response.json();
      console.log('📥 注册响应:', { status: response.status, data });

      if (!response.ok) {
        // 处理不同类型的错误
        const errorMessage = data.message || 
                           (response.status === 409 ? '该邮箱已被注册' : 
                            response.status === 400 ? '请求数据无效' : 
                            `注册失败: ${response.status}`);
        setError(errorMessage);
        return;
      }

      // 注册成功
      setSuccessMessage('注册成功！正在跳转到登录页面...');
      
      // 清空表单
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setAgreedToTerms(false);

      // 延迟跳转让用户看到成功消息
      setTimeout(() => {
        safeRouterPush('/auth/signin?message=registered');
      }, 1500);
      
    } catch (error) {
      console.error('注册网络错误:', error);
      setError('网络连接错误，请检查您的网络连接后重试');
    } finally {
      setIsLoading(false);
    }
  }, [formData, agreedToTerms, validateForm, safeRouterPush]);

  // 字段验证状态
  const getFieldError = (fieldName) => {
    if (!touched[fieldName]) return null;
    
    switch (fieldName) {
      case 'username':
        if (!formData.username) return '用户名不能为空';
        if (formData.username.length < 2) return '用户名至少需要2个字符';
        break;
      case 'email':
        if (!formData.email) return '邮箱地址不能为空';
        if (!/\S+@\S+\.\S+/.test(formData.email)) return '请输入有效的邮箱地址';
        break;
      case 'password':
        if (!formData.password) return '密码不能为空';
        if (formData.password.length < 6) return '密码至少需要6位';
        break;
      case 'confirmPassword':
        if (!formData.confirmPassword) return '请确认密码';
        if (formData.password !== formData.confirmPassword) return '密码确认不一致';
        break;
      default:
        return null;
    }
    
    return null;
  };

  // 服务器端渲染的简单版本
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthLayout 
        title="创建您的账户" 
        subtitle="加入我们，体验人工智能的强大功能"
        isMobile={isMobile}
      >
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* 成功消息 */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <i className="fas fa-check-circle mr-2"></i>
              {successMessage}
            </div>
          )}

          {/* 错误消息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* 用户名字段 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名 *
            </label>
            <div className="relative">
              <i className="fas fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="username"
                type="text"
                className={`input-field ${getFieldError('username') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入用户名（2-20个字符）"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                required
                minLength={2}
                maxLength={20}
                autoComplete="username"
              />
            </div>
            {getFieldError('username') && (
              <div className="text-red-500 text-xs mt-1 flex items-center">
                <i className="fas fa-exclamation-circle mr-1"></i>
                {getFieldError('username')}
              </div>
            )}
          </div>

          {/* 邮箱字段 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              电子邮箱 *
            </label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="email"
                type="email"
                className={`input-field ${getFieldError('email') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入您的邮箱"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>
            {getFieldError('email') && (
              <div className="text-red-500 text-xs mt-1 flex items-center">
                <i className="fas fa-exclamation-circle mr-1"></i>
                {getFieldError('email')}
              </div>
            )}
          </div>

          {/* 密码字段 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码 *
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                className={`input-field pr-10 ${getFieldError('password') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入密码（至少6位）"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                minLength={6}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
            
            {/* 密码强度指示器 */}
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">密码强度:</span>
                  <span className={`font-medium ${
                    passwordStrength.strength >= 4 ? 'text-green-600' :
                    passwordStrength.strength >= 3 ? 'text-yellow-600' :
                    passwordStrength.strength >= 2 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {getFieldError('password') && (
              <div className="text-red-500 text-xs mt-1 flex items-center">
                <i className="fas fa-exclamation-circle mr-1"></i>
                {getFieldError('password')}
              </div>
            )}
          </div>

          {/* 确认密码字段 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认密码 *
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className={`input-field pr-10 ${getFieldError('confirmPassword') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请再次输入密码"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
            {getFieldError('confirmPassword') && (
              <div className="text-red-500 text-xs mt-1 flex items-center">
                <i className="fas fa-exclamation-circle mr-1"></i>
                {getFieldError('confirmPassword')}
              </div>
            )}
          </div>

          {/* 服务条款 */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={isLoading}
              required
            />
            <label className="text-sm text-gray-700">
              我同意 <Link href="/terms" className="text-blue-600 hover:text-blue-800 font-medium">服务条款</Link> 和 <Link href="/privacy" className="text-blue-600 hover:text-blue-800 font-medium">隐私政策</Link>
            </label>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>注册中...</span>
              </>
            ) : (
              <>
                <i className="fas fa-user-plus"></i>
                <span>注册账户</span>
              </>
            )}
          </button>
        </form>

        {/* 登录链接 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            已经有账户？{' '}
            <Link 
              href="/auth/signin" 
              className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              立即登录
            </Link>
          </p>
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
}