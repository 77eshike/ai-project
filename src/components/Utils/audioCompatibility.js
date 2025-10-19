// /opt/ai-project/src/components/utils/audioCompatibility.js
export const checkAudioCompatibility = () => {
  const compatibility = {
    webAudioAPI: !!(window.AudioContext || window.webkitAudioContext),
    mediaRecorder: !!window.MediaRecorder,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    pcmSupport: false,
    sampleRates: [],
    browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)\/([0-9]+)/)?.[1] || 'unknown'
  };

  // PCM专用采样率检查 - 百度推荐格式
  const pcmSampleRates = [8000, 16000, 22050, 44100, 48000];
  
  if (compatibility.webAudioAPI) {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      
      // 检查PCM支持的采样率
      compatibility.sampleRates = pcmSampleRates.filter(rate => {
        try {
          const testContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: rate
          });
          const supported = Math.abs(testContext.sampleRate - rate) < 1;
          testContext.close();
          return supported;
        } catch {
          return false;
        }
      });
      
      // 检查16kHz PCM支持（百度推荐）
      compatibility.pcmSupport = compatibility.sampleRates.includes(16000);
      
      // 浏览器特定的兼容性提示
      if (compatibility.browser === 'Safari') {
        console.log('ℹ️ Safari浏览器PCM支持可能有限');
      }
      
      context.close();
    } catch (error) {
      console.warn('PCM音频兼容性检查失败:', error);
    }
  }

  console.log('🎵 PCM音频兼容性检查完成:', {
    webAudioAPI: compatibility.webAudioAPI,
    getUserMedia: compatibility.getUserMedia,
    pcmSupport: compatibility.pcmSupport,
    sampleRates: compatibility.sampleRates,
    browser: compatibility.browser
  });
  
  return compatibility;
};

// PCM配置推荐 - 百度官方推荐格式
export const getRecommendedPCMConfig = () => {
  const compatibility = checkAudioCompatibility();
  
  // 始终优先使用16kHz PCM（百度推荐）
  if (compatibility.pcmSupport) {
    return {
      sampleRate: 16000,
      channelCount: 1,
      bitsPerSample: 16,
      frameSize: 4096,
      supported: true,
      format: 'pcm',
      note: '使用百度推荐的16kHz PCM格式'
    };
  } else if (compatibility.sampleRates.length > 0) {
    // 降级到支持的采样率
    const supportedRate = compatibility.sampleRates
      .sort((a, b) => Math.abs(a - 16000) - Math.abs(b - 16000))[0]; // 最接近16kHz的
    
    return {
      sampleRate: supportedRate,
      channelCount: 1,
      bitsPerSample: 16,
      frameSize: 4096,
      supported: true,
      note: `使用${supportedRate}Hz替代16kHz`,
      format: 'pcm'
    };
  } else {
    // 回退配置
    return {
      sampleRate: 16000,
      channelCount: 1,
      bitsPerSample: 16,
      frameSize: 4096,
      supported: false,
      note: '使用默认PCM配置，兼容性可能有限',
      format: 'pcm'
    };
  }
};

// 检查特定PCM配置是否支持
export const isPCMConfigSupported = (config = {}) => {
  const { sampleRate = 16000, channelCount = 1 } = config;
  const compatibility = checkAudioCompatibility();
  
  return {
    sampleRateSupported: compatibility.sampleRates.includes(sampleRate),
    channelCountSupported: channelCount <= 2, // 大多数浏览器支持单声道或立体声
    overall: compatibility.sampleRates.includes(sampleRate) && channelCount <= 2
  };
};

// 获取PCM录音状态报告
export const getPCMRecordingReport = () => {
  const compatibility = checkAudioCompatibility();
  const config = getRecommendedPCMConfig();
  const status = isPCMConfigSupported(config);
  
  return {
    status: compatibility.webAudioAPI && compatibility.getUserMedia ? 'ready' : 'limited',
    compatibility: {
      audioContext: compatibility.webAudioAPI,
      microphone: compatibility.getUserMedia,
      pcm: compatibility.pcmSupport
    },
    recommendedConfig: config,
    supportDetails: status,
    browser: compatibility.browser,
    timestamp: new Date().toISOString()
  };
};

// 验证PCM数据质量
export const validatePCMData = (pcmData, config = { sampleRate: 16000, channelCount: 1 }) => {
  const report = {
    isValid: false,
    duration: 0,
    sampleCount: 0,
    issues: []
  };

  if (!pcmData || pcmData.length === 0) {
    report.issues.push('空的PCM数据');
    return report;
  }

  report.sampleCount = pcmData.length;
  report.duration = (pcmData.length / config.sampleRate).toFixed(2) + 's';
  
  // 检查数据长度是否合理
  if (pcmData.length < config.sampleRate * 0.5) { // 少于0.5秒
    report.issues.push('录音时间太短');
  }
  
  if (pcmData.length > config.sampleRate * 60) { // 超过60秒
    report.issues.push('录音时间过长');
  }

  // 检查静音（简单的静音检测）
  let sum = 0;
  for (let i = 0; i < Math.min(pcmData.length, 1000); i++) {
    sum += Math.abs(pcmData[i]);
  }
  const average = sum / Math.min(pcmData.length, 1000);
  
  if (average < 100) { // 阈值可能需要调整
    report.issues.push('检测到可能的静音数据');
  }

  report.isValid = report.issues.length === 0;
  return report;
};

export default {
  checkAudioCompatibility,
  getRecommendedPCMConfig,
  isPCMConfigSupported,
  getPCMRecordingReport,
  validatePCMData
};