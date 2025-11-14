// components/ForceLogoutButton.js - 完整修复版本
import { signOut } from 'next-auth/react';

export default function ForceLogoutButton() {
  const handleForceLogout = async () => {
    try {
      console.log('🚨 开始强制退出流程...');
      
      // 方法1: 先调用强制退出 API
      try {
        const response = await fetch('/api/auth/force-logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ API 退出成功:', result);
          
          // 如果 API 返回了重定向URL，使用它
          if (result.redirectTo) {
            window.location.href = result.redirectTo;
            return;
          }
        }
      } catch (apiError) {
        console.warn('API 退出失败，继续使用 NextAuth 退出:', apiError);
      }

      // 方法2: 使用 NextAuth 的 signOut
      console.log('🔐 执行 NextAuth signOut...');
      await signOut({ 
        redirect: true,
        callbackUrl: '/auth/signin?logout=success&t=' + Date.now()
      });

      // 方法3: 备用重定向
      setTimeout(() => {
        console.log('🔄 备用重定向...');
        window.location.href = '/auth/signin?logout=force&t=' + Date.now();
      }, 2000);

    } catch (error) {
      console.error('❌ 所有退出方法都失败:', error);
      window.location.href = '/auth/signin?logout=error&t=' + Date.now();
    }
  };

  return (
    <button 
      onClick={handleForceLogout}
      style={{
        padding: '8px 16px',
        background: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      🚨 强制退出登录
    </button>
  );
}