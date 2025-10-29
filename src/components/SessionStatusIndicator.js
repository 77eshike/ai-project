// src/components/SessionStatusIndicator.js
import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';

const SessionStatusIndicator = () => {
  const [sessionStatus, setSessionStatus] = useState('checking');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const session = await getSession();
        const newStatus = session ? 'valid' : 'expired';
        
        // 只在状态变化时显示提示
        if (newStatus !== sessionStatus) {
          setSessionStatus(newStatus);
          setIsVisible(true);
          
          // 3秒后自动隐藏
          setTimeout(() => {
            setIsVisible(false);
          }, 3000);
        }
        
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('会话状态检查错误:', error);
        setSessionStatus('error');
      }
    };

    // 初始检查
    checkSessionStatus();

    // 定期检查（每5分钟）
    const interval = setInterval(checkSessionStatus, 5 * 60 * 1000);

    // 页面聚焦时检查
    const handleFocus = () => checkSessionStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sessionStatus]);

  if (!isVisible || sessionStatus === 'checking') return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`px-4 py-3 rounded-lg shadow-lg border ${
        sessionStatus === 'valid' 
          ? 'bg-green-100 text-green-800 border-green-200' 
          : 'bg-red-100 text-red-800 border-red-200'
      }`}>
        <div className="flex items-center space-x-2">
          <span className={`w-3 h-3 rounded-full ${
            sessionStatus === 'valid' ? 'bg-green-500' : 'bg-red-500'
          }`}></span>
          <span className="font-medium">
            {sessionStatus === 'valid' ? '✅ 会话有效' : '❌ 会话已过期'}
          </span>
        </div>
        <div className="text-xs mt-1 opacity-75">
          最后更新: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default SessionStatusIndicator;