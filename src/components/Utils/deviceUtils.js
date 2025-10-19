// src/components/Utils/deviceUtils.js - 完整修复版本

// 添加防抖和缓存机制
let cachedDeviceInfo = null;
let lastDetectionTime = 0;
const DETECTION_CACHE_TIME = 5000; // 5秒缓存
let detectionCount = 0;

const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

export const getDeviceInfo = () => {
  const now = Date.now();
  
  // 使用缓存，避免频繁检测
  if (cachedDeviceInfo && (now - lastDetectionTime) < DETECTION_CACHE_TIME) {
    return cachedDeviceInfo;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const isSmallScreen = screenWidth < 768;
  const isHighDPI = window.devicePixelRatio > 1;
  
  const info = {
    userAgent: !!userAgent,
    touch: isTouch,
    screenWidth: `${screenWidth}px`,
    screenHeight: `${screenHeight}px`,
    smallScreen: isSmallScreen,
    highDPI: isHighDPI,
    deviceType: isMobile ? 'mobile' : 'desktop',
    browser: getBrowserInfo(),
    platform: navigator.platform
  };
  
  cachedDeviceInfo = info;
  lastDetectionTime = now;
  detectionCount++;
  
  // 只在第一次检测时记录详细信息
  if (detectionCount === 1) {
    console.log('📱 移动端检测详情:', info);
  }
  
  return info;
};

// 清除缓存函数（在窗口大小改变时调用）
export const clearDeviceInfoCache = () => {
  cachedDeviceInfo = null;
  lastDetectionTime = 0;
};

export const checkNetworkStatus = () => {
  const connection = navigator.connection;
  if (connection) {
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  return {
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  };
};

export const checkMicrophonePermission = async () => {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      return {
        status: permissionStatus.state,
        granted: permissionStatus.state === 'granted'
      };
    }
    
    // 如果权限API不可用，尝试通过getUserMedia检测
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { status: 'granted', granted: true };
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        return { status: 'denied', granted: false };
      }
      return { status: 'prompt', granted: false };
    }
  } catch (error) {
    console.warn('权限检查失败:', error);
    return { status: 'unknown', granted: false };
  }
};

export const checkSpeechSupport = () => {
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
  const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  return {
    supported: hasGetUserMedia && hasAudioContext,
    webSpeechSupported: hasWebSpeech,
    getUserMedia: hasGetUserMedia,
    audioContext: hasAudioContext
  };
};

export const isMobileDevice = () => {
  const info = getDeviceInfo();
  return info.deviceType === 'mobile';
};

export const getPlatformLockInfo = () => {
  const isMobile = isMobileDevice();
  return {
    locked: isMobile,
    forcedPlatform: isMobile ? 'baidu' : null,
    reason: isMobile ? '移动端强制使用百度语音' : '桌面端可自由选择'
  };
};

export const getForcedSpeechPlatform = () => {
  return isMobileDevice() ? 'baidu' : 'web';
};

export const isPlatformLocked = () => {
  return isMobileDevice();
};

// 监听窗口大小变化，重新检测
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    setTimeout(clearDeviceInfoCache, 100);
  });
  
  // 页面可见性变化时也清除缓存
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      clearDeviceInfoCache();
    }
  });
}