// src/components/Utils/deviceUtils.js - 修复版本

// 修复：将所有函数定义移到导出之前，避免循环依赖
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

const getDeviceInfo = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const isSmallScreen = screenWidth < 768;
  const isHighDPI = window.devicePixelRatio > 1;
  
  return {
    userAgent: navigator.userAgent,
    isTouch,
    screenWidth,
    screenHeight,
    isSmallScreen,
    isHighDPI,
    deviceType: isMobile ? 'mobile' : 'desktop',
    browser: getBrowserInfo(),
    platform: navigator.platform,
    isMobile
  };
};

const checkNetworkStatus = () => {
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

const checkSpeechSupport = () => {
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
  const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  const supportLevel = hasGetUserMedia && hasAudioContext ? 'full' : 
                      hasGetUserMedia ? 'basic' : 'none';
  
  return {
    supported: hasGetUserMedia && hasAudioContext,
    webSpeechSupported: hasWebSpeech,
    getUserMedia: hasGetUserMedia,
    audioContext: hasAudioContext,
    supportLevel
  };
};

const isMobileDevice = () => {
  const info = getDeviceInfo();
  return info.isMobile;
};

const getPlatformLockInfo = () => {
  const isMobile = isMobileDevice();
  return {
    locked: isMobile,
    forcedPlatform: isMobile ? 'baidu' : 'web',
    reason: isMobile ? '移动端强制使用百度语音' : '桌面端可自由选择'
  };
};

const getForcedSpeechPlatform = () => {
  return isMobileDevice() ? 'baidu' : 'web';
};

const isPlatformLocked = () => {
  return isMobileDevice();
};

// 请求麦克风权限
const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return 'granted';
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return 'denied';
    }
    return 'prompt';
  }
};

// 导出所有函数
export {
  getDeviceInfo,
  checkNetworkStatus,
  checkSpeechSupport,
  isMobileDevice,
  getPlatformLockInfo,
  getForcedSpeechPlatform,
  isPlatformLocked,
  requestMicrophonePermission
};