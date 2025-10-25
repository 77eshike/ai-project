// pages/auth/signup.js - 修复硬导航版本
import { useState, useCallback, useEffect } from 'react';
import AuthLayout from '../../components/Layout/AuthLayout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ErrorBoundary from '../../components/ErrorBoundary';

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
  
  const router = useRouter();

  // 修复：改进的 hydration 处理
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    }
  }, []);

  const handleChange = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }, []);

  const handleBlur = useCallback((e) => {
    setTouched(prev => ({
      ...prev,
      [e.target.name]: true
    }));
  }, []);

  // 修复：安全的路由跳转函数
  const safeRouterPush = useCallback((url) => {
    if (!isClient) return;
    
    // 检查是否已经在目标页面
    const currentPath = window.location.pathname + window.location.search;
    const targetPath = url.split('?')[0]; // 移除查询参数比较
    
    if (currentPath === targetPath) {
      console.warn('阻止硬导航到相同URL:', url);
      return;
    }
    
    // 使用 router.push 进行客户端导航
    router.push(url);
  }, [router, isClient]);

  // 修复：改进的提交处理
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    // 表单验证
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('密码确认不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6位');
      return;
    }

    if (!agreedToTerms) {
      setError('请同意服务条款和隐私政策');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 发送注册请求');

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || `注册失败: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log('📥 注册响应:', data);

      // 修复：使用安全的路由跳转
      alert('注册成功！请登录');
      safeRouterPush('/auth/signin');
      
    } catch (error) {
      console.error('注册错误:', error);
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [formData, agreedToTerms, safeRouterPush]);

  // 密码强度计算
  const getPasswordStrength = useCallback(() => {
    if (!formData.password) return 0;
    
    let strength = 0;
    if (formData.password.length >= 6) strength += 1;
    if (formData.password.length >= 8) strength += 1;
    if (/[A-Z]/.test(formData.password)) strength += 1;
    if (/[0-9]/.test(formData.password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength += 1;
    
    return strength;
  }, [formData.password]);

  const passwordStrength = getPasswordStrength();
  const strengthLabels = ['非常弱', '弱', '一般', '强', '非常强'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-600'];

  // 邮箱验证
  const isEmailValid = formData.email ? /\S+@\S+\.\S+/.test(formData.email) : true;

  // 处理社交登录
  const handleSocialLogin = useCallback((provider) => {
    console.log(`尝试使用 ${provider} 登录`);
    // 在实际应用中，您应该调用 signIn(provider) 方法
  }, []);

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
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 表单字段保持不变 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <div className="relative">
              <i className="fas fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="username"
                type="text"
                className="input-field"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                required
                autoComplete="username"
              />
            </div>
            {touched.username && !formData.username && (
              <div className="text-red-500 text-xs mt-1">用户名不能为空</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              电子邮箱
            </label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="email"
                type="email"
                className="input-field"
                placeholder="请输入您的邮箱"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>
            {touched.email && !isEmailValid && (
              <div className="text-red-500 text-xs mt-1">请输入有效的邮箱地址</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                className="input-field pr-10"
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
            
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center mb-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${strengthColors[passwordStrength - 1] || 'bg-red-500'}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  密码强度: {formData.password ? strengthLabels[passwordStrength - 1] || '非常弱' : '未输入'}
                </div>
              </div>
            )}
            {touched.password && formData.password.length < 6 && (
              <div className="text-red-500 text-xs mt-1">密码至少需要6位</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认密码
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="input-field pr-10"
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
            {touched.confirmPassword && formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div className="text-red-500 text-xs mt-1">密码不匹配</div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={isLoading}
              required
            />
            <label className="ml-2 block text-sm text-gray-700">
              我同意 <Link href="/terms" className="text-blue-600 hover:text-blue-800">服务条款</Link> 和 <Link href="/privacy" className="text-blue-600 hover:text-blue-800">隐私政策</Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                注册中...
              </>
            ) : (
              '注册账户'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            已经有账户？{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800 font-semibold">
              立即登录
            </Link>
          </p>
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
}