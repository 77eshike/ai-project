// src/components/chat/index.js
import { useState, useEffect } from 'react';
import ChatTabDesktop from './ChatTabDesktop';
import ChatTabMobile from './ChatTabMobile';
import deviceDetector from '../Utils/deviceDetector';

const ChatTab = ({ user, voiceEnabled, toggleVoice, className }) => {
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectDevice = () => {
      if (typeof window === 'undefined') {
        setDeviceInfo({ isMobile: false, deviceType: 'desktop' });
        setIsLoading(false);
        return;
      }

      // 添加延迟确保DOM完全加载
      setTimeout(() => {
        const info = deviceDetector.getDeviceInfo();
        console.log('🚀 最终设备检测结果:', info);
        
        setDeviceInfo(info);
        setIsLoading(false);
      }, 100);
    };

    detectDevice();

    // 监听窗口变化，实时更新设备类型
    const handleResize = () => {
      const newInfo = deviceDetector.getDeviceInfo();
      if (newInfo.isMobile !== deviceInfo?.isMobile) {
        console.log('🔄 设备类型变化:', newInfo);
        setDeviceInfo(newInfo);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deviceInfo?.isMobile]);

  if (isLoading || !deviceInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          检测设备环境中...
        </div>
      </div>
    );
  }

  console.log('🎯 加载组件:', deviceInfo.isMobile ? 'ChatTabMobile' : 'ChatTabDesktop');

  // 强制测试：如果是Chrome移动版，强制使用移动端组件
  const forceMobile = deviceInfo.browser === 'chrome' && 
                     (deviceInfo.isMobile || window.innerWidth < 768);
  
  const Component = forceMobile ? ChatTabMobile : 
                   deviceInfo.isMobile ? ChatTabMobile : ChatTabDesktop;

  return (
    <Component
      user={user}
      voiceEnabled={voiceEnabled}
      toggleVoice={toggleVoice}
      className={className}
    />
  );
};

export default ChatTab;
