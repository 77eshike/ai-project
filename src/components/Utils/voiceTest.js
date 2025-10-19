// utils/voiceTest.js

/**
 * 快速语音识别测试函数
 * 用于诊断语音识别功能是否正常工作
 */
export const quickVoiceTest = (onResult, onError) => {
  if (typeof window === 'undefined') {
    onError?.('不在浏览器环境中');
    return null;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.('浏览器不支持语音识别');
    return null;
  }
  
  console.log('🔊 开始快速语音测试...');
  const recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  
  let hasResult = false;
  
  recognition.onstart = () => {
    console.log('🎤 测试开始聆听...');
    onResult?.('info', '测试中...请说话');
  };
  
  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    const confidence = result[0].confidence;
    
    console.log('测试识别结果:', { 
      transcript, 
      isFinal: result.isFinal,
      confidence 
    });
    
    if (result.isFinal && transcript) {
      hasResult = true;
      onResult?.('success', `测试成功！识别结果: "${transcript}" (置信度: ${(confidence * 100).toFixed(1)}%)`);
      recognition.stop();
    }
  };
  
  recognition.onend = () => {
    console.log('🛑 测试识别结束');
    if (!hasResult) {
      onResult?.('warning', '测试完成，但未识别到语音内容');
    }
  };
  
  recognition.onerror = (event) => {
    console.log('测试错误:', event.error);
    onResult?.('error', `测试失败: ${getErrorDescription(event.error)}`);
  };
  
  recognition.start();
  
  // 10秒后自动停止测试
  const timeoutId = setTimeout(() => {
    try {
      recognition.stop();
    } catch (e) {
      // 忽略错误
    }
  }, 10000);
  
  return () => {
    clearTimeout(timeoutId);
    try {
      recognition.stop();
    } catch (e) {
      // 忽略错误
    }
  };
};

/**
 * 麦克风设备测试
 * 检测麦克风是否可用并能接收声音
 */
export const testMicrophone = async (onVolume) => {
  try {
    console.log('🎤 开始麦克风测试...');
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let maxVolume = 0;
    let soundDetected = false;
    
    const testInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const volume = Math.max(...dataArray);
      maxVolume = Math.max(maxVolume, volume);
      
      onVolume?.(volume, maxVolume);
      
      if (volume > 10 && !soundDetected) {
        soundDetected = true;
        console.log('🎯 检测到声音输入');
      }
    }, 100);
    
    // 返回清理函数和测试状态
    return {
      cleanup: () => {
        clearInterval(testInterval);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      },
      getResult: () => ({
        soundDetected,
        maxVolume,
        status: soundDetected ? 'success' : maxVolume > 0 ? 'warning' : 'error'
      })
    };
    
  } catch (error) {
    console.error('麦克风测试失败:', error);
    throw new Error(`麦克风测试失败: ${error.message}`);
  }
};

/**
 * 获取错误描述
 */
const getErrorDescription = (error) => {
  const errorMap = {
    'not-allowed': '麦克风权限被拒绝',
    'permission-denied': '麦克风权限被拒绝',
    'audio-capture': '无法访问麦克风设备',
    'no-speech': '未检测到语音输入',
    'network': '网络错误',
    'not-supported': '浏览器不支持语音识别',
    'service-not-allowed': '语音识别服务不可用',
    'bad-grammar': '语法错误',
    'language-not-supported': '语言不支持'
  };
  
  return errorMap[error] || `未知错误: ${error}`;
};

/**
 * 检查浏览器语音识别支持情况
 */
export const checkBrowserSupport = () => {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      reason: '不在浏览器环境中'
    };
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;
  
  return {
    supported: isSupported,
    SpeechRecognition: !!window.SpeechRecognition,
    webkitSpeechRecognition: !!window.webkitSpeechRecognition,
    userAgent: navigator.userAgent,
    language: navigator.language
  };
};

/**
 * 获取推荐的浏览器设置
 */
export const getBrowserRecommendations = () => {
  const supportInfo = checkBrowserSupport();
  
  if (supportInfo.supported) {
    return {
      status: 'supported',
      message: '当前浏览器支持语音识别',
      recommendations: [
        '确保已允许网站使用麦克风',
        '在安静环境中使用',
        '说话清晰，音量适中'
      ]
    };
  }
  
  // 分析用户代理字符串提供具体建议
  const ua = navigator.userAgent.toLowerCase();
  let recommendedBrowser = 'Chrome';
  
  if (ua.includes('firefox')) {
    recommendedBrowser = 'Chrome 或 Edge';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    recommendedBrowser = 'Chrome 或 Safari 14+';
  }
  
  return {
    status: 'not-supported',
    message: '当前浏览器不支持语音识别',
    recommendations: [
      `建议使用 ${recommendedBrowser} 浏览器`,
      '确保浏览器版本较新',
      '检查浏览器设置中的权限配置'
    ]
  };
};