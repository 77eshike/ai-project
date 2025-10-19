// pages/auth/signup.js
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

  // 应用官方 hydration 解决方案
  useEffect(() => {
    setIsClient(true);
    
    // 只在客户端检测设备类型
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = 
        /android|avantgo|playbook|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substr(0, 4));
      
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
      console.log('📤 发送注册请求:', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      // 首先检查响应状态
      if (!response.ok) {
        // 尝试解析错误响应
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // 如果响应不是JSON，使用状态文本
          console.error('响应解析错误:', parseError);
          setError(`注册失败: ${response.status} ${response.statusText}`);
          return;
        }
        
        setError(errorData.message || `注册失败: ${response.status}`);
        
        // 显示详细的错误信息
        if (errorData.details) {
          const detailMessages = Object.values(errorData.details).filter(Boolean);
          if (detailMessages.length > 0) {
            setError(detailMessages.join(', '));
          }
        }
        return;
      }

      // 解析成功响应
      const data = await response.json();
      console.log('📥 注册响应:', data);

      alert('注册成功！请登录');
      router.push('/auth/signin');
      
    } catch (error) {
      console.error('注册错误:', error);
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [formData, agreedToTerms, router]);

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
    // 这里可以添加实际的社交登录逻辑
    console.log(`尝试使用 ${provider} 登录`);
    // 在实际应用中，您应该调用 signIn(provider) 方法
    // signIn(provider);
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

  // 客户端渲染的完整版本
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

        {/* 调试信息 - 仅开发环境显示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">调试信息</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => console.log('表单数据:', formData)}
                className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                查看表单数据
              </button>
              <button
                type="button"
                onClick={async () => {
                  const testData = {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'test123'
                  };
                  console.log('测试请求:', testData);
                  try {
                    const response = await fetch('/api/auth/register', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(testData),
                    });
                    const result = await response.json();
                    console.log('测试响应:', { status: response.status, result });
                  } catch (error) {
                    console.error('测试错误:', error);
                  }
                }}
                className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                测试API
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或使用以下方式注册</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              disabled={isLoading}
              aria-label="使用Google注册"
            >
              <i className="fab fa-google"></i>
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
              disabled={isLoading}
              aria-label="使用Facebook注册"
            >
              <i className="fab fa-facebook-f"></i>
            </button>
          </div>
        </div>

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