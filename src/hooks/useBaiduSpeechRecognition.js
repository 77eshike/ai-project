// src/hooks/useBaiduSpeechRecognition.js - 完整修复版本
import { useState, useRef, useCallback, useEffect } from 'react';

const useBaiduSpeechRecognition = (options = {}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionState, setPermissionState] = useState('prompt');
  const [audioMethod, setAudioMethod] = useState('none');

  // Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const pcmDataRef = useRef([]);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const processingActiveRef = useRef(false);
  const isStoppingRef = useRef(false);
  
  // 音频处理专用 refs
  const audioLevelRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const dataArrayRef = useRef(null);
  const bufferLengthRef = useRef(0);

  // 添加启动超时检测
  const startTimeoutRef = useRef(null);

  // 添加语音活动检测
  const voiceActivityRef = useRef({
    hasSpeech: false,
    speechStartTime: 0,
    totalSamples: 0,
    silentSamples: 0,
    speechThreshold: 0.015,
    minSpeechDuration: 800
  });

  // ArrayBuffer 转 base64 函数
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // 生成唯一用户ID（类似官方示例）
  const generateCuid = () => {
    return 'web_speech_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  // 获取百度token（通过后端API）
  const getBaiduToken = async () => {
    try {
      const response = await fetch('/api/baidu-token');
      const data = await response.json();
      if (data.token) {
        return data.token;
      } else {
        throw new Error('获取百度token失败');
      }
    } catch (error) {
      console.error('获取百度token失败:', error);
      throw new Error('语音服务暂时不可用');
    }
  };

  // 检查浏览器支持
  const checkBrowserSupport = useCallback(() => {
    const hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia);
    const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
    return hasGetUserMedia && hasAudioContext;
  }, []);

  // 资源清理 - 增强版本
  const cleanupAudioResources = useCallback(async () => {
    if (!isMountedRef.current) return;

    console.log('🧹 清理音频资源...');

    try {
      processingActiveRef.current = false;
      isStoppingRef.current = false;

      // 清除启动超时
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (streamRef.current) {
        console.log('🛑 停止媒体流轨道...');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }

      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }

      if (audioContextRef.current) {
        console.log('🔇 关闭音频上下文...');
        if (audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
        }
        audioContextRef.current = null;
      }

      pcmDataRef.current = [];
      dataArrayRef.current = null;

      // 重置语音活动检测
      voiceActivityRef.current = {
        hasSpeech: false,
        speechStartTime: 0,
        totalSamples: 0,
        silentSamples: 0,
        speechThreshold: 0.015,
        minSpeechDuration: 800
      };

    } catch (error) {
      console.warn('资源清理错误:', error);
    } finally {
      setListening(false);
      setIsProcessing(false);
      setStatus('idle');
      setAudioLevel(0);
      audioLevelRef.current = 0;
      lastUpdateTimeRef.current = 0;
      console.log('✅ 资源清理完成');
    }
  }, []);

  // 优化的音频处理设置
  const setupAudioProcessing = useCallback(async (stream) => {
    try {
      console.log('🎵 开始设置音频处理...');

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext({ 
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      audioContextRef.current = audioContext;

      // 确保音频上下文是活跃状态
      if (audioContext.state === 'suspended') {
        console.log('⏸️ 音频上下文被挂起，尝试恢复...');
        await audioContext.resume();
      }

      console.log('✅ 音频上下文创建成功:', audioContext.state);

      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      
      // 增强音频处理链
      // 1. 高通滤波器 - 去除低频噪音
      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 80;
      
      // 2. 低通滤波器 - 去除高频噪音
      const lowPassFilter = audioContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.value = 4000;
      
      // 3. 动态压缩器 - 平衡音量
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;
      
      // 连接完整的音频处理链
      mediaStreamSource.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(compressor);
      compressor.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Float32Array(bufferLength);
      
      processingActiveRef.current = true;
      lastUpdateTimeRef.current = Date.now();
      
      // 重置语音活动检测
      voiceActivityRef.current = {
        hasSpeech: false,
        speechStartTime: 0,
        totalSamples: 0,
        silentSamples: 0,
        speechThreshold: 0.015,
        minSpeechDuration: 800
      };
      
      // 优化的音频处理循环
      const processAudio = () => {
        if (!processingActiveRef.current || !isMountedRef.current) {
          return;
        }
        
        try {
          const dataArray = dataArrayRef.current;
          analyser.getFloatTimeDomainData(dataArray);
          
          // 改进的音量计算 - 使用能量计算
          let sumSquares = 0;
          let peak = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i];
            sumSquares += value * value;
            if (Math.abs(value) > peak) peak = Math.abs(value);
          }
          
          const rms = Math.sqrt(sumSquares / dataArray.length);
          const volume = Math.max(rms, peak * 0.5);
          
          audioLevelRef.current = Math.min(100, volume * 800);

          // 语音活动检测
          const isSpeech = volume > voiceActivityRef.current.speechThreshold;
          const now = Date.now();
          
          if (isSpeech) {
            if (!voiceActivityRef.current.hasSpeech) {
              voiceActivityRef.current.hasSpeech = true;
              voiceActivityRef.current.speechStartTime = now;
              console.log('🎤 检测到语音活动');
            }
            voiceActivityRef.current.silentSamples = 0;
          } else {
            voiceActivityRef.current.silentSamples += dataArray.length;
          }
          
          voiceActivityRef.current.totalSamples += dataArray.length;

          // 转换为PCM - 优化动态范围
          const pcmData = new Int16Array(dataArray.length);
          const compressionFactor = 1.5;
          
          for (let i = 0; i < dataArray.length; i++) {
            let s = Math.max(-1, Math.min(1, dataArray[i]));
            s = Math.sign(s) * Math.min(1, Math.abs(s) * compressionFactor);
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // 调整保存数据的阈值
          if (audioLevelRef.current > 2) {
            pcmDataRef.current.push(pcmData);
          }

          // 限制缓冲区大小
          if (pcmDataRef.current.length > 400) {
            pcmDataRef.current = pcmDataRef.current.slice(-300);
          }

          // 更新音频电平
          const currentTime = Date.now();
          if (currentTime - lastUpdateTimeRef.current > 150) {
            setAudioLevel(Math.round(audioLevelRef.current));
            lastUpdateTimeRef.current = currentTime;
          }

          if (processingActiveRef.current && isMountedRef.current) {
            animationFrameRef.current = requestAnimationFrame(processAudio);
          }
        } catch (error) {
          console.error('音频处理错误:', error);
          processingActiveRef.current = false;
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(processAudio);
      setAudioMethod('enhanced-analyser');
      console.log('✅ 音频处理设置完成 - 增强模式');
      
      return 'enhanced-analyser';
    } catch (error) {
      console.error('❌ 音频处理设置失败:', error);
      throw error;
    }
  }, []);

  // 检查是否有有效的语音输入
  const hasValidSpeechInput = useCallback(() => {
    const dataLength = pcmDataRef.current.reduce((sum, data) => sum + data.length, 0);
    const voiceActivity = voiceActivityRef.current;
    
    console.log('🔍 检查语音输入有效性:', {
      totalSamples: dataLength,
      hasSpeech: voiceActivity.hasSpeech,
      speechDuration: voiceActivity.hasSpeech ? Date.now() - voiceActivity.speechStartTime : 0,
      silentRatio: voiceActivity.totalSamples > 0 ? (voiceActivity.silentSamples / voiceActivity.totalSamples).toFixed(2) : 1
    });

    // 检查是否有足够的语音数据
    if (dataLength === 0) {
      return { valid: false, reason: '没有检测到音频数据' };
    }

    // 检查是否有语音活动
    if (!voiceActivity.hasSpeech) {
      return { valid: false, reason: '没有检测到语音活动' };
    }

    // 检查语音持续时间是否足够
    const speechDuration = Date.now() - voiceActivity.speechStartTime;
    if (speechDuration < voiceActivity.minSpeechDuration) {
      return { 
        valid: false, 
        reason: `语音太短 (${speechDuration}ms)，请至少说话${voiceActivity.minSpeechDuration}ms` 
      };
    }

    // 检查静音比例
    const silentRatio = voiceActivity.totalSamples > 0 ? voiceActivity.silentSamples / voiceActivity.totalSamples : 1;
    if (silentRatio > 0.95) {
      return { 
        valid: false, 
        reason: '语音信号太弱，请靠近麦克风说话' 
      };
    }

    return { valid: true };
  }, []);

  // 处理音频数据 - 按照百度官方示例
  const processAndSendAudio = useCallback(async (pcmDataArray) => {
    try {
      console.log('🎵 开始处理PCM音频数据...');
      
      if (!pcmDataArray || pcmDataArray.length === 0) {
        throw new Error('没有PCM数据需要处理');
      }

      // 合并所有PCM数据块
      const totalSamples = pcmDataArray.reduce((sum, data) => sum + data.length, 0);
      const mergedPcmData = new Int16Array(totalSamples);
      let offset = 0;
      pcmDataArray.forEach(data => {
        if (data && data.length) {
          mergedPcmData.set(data, offset);
          offset += data.length;
        }
      });

      // 检查音频长度
      const minSamples = 16000 * 0.8; // 至少0.8秒
      if (totalSamples < minSamples) {
        throw new Error(`语音太短，请至少录制0.8秒 (当前: ${(totalSamples / 16000).toFixed(2)}s)`);
      }

      console.log(`📤 准备发送PCM数据到百度API: ${mergedPcmData.length} 采样点`);

      // 将PCM数据转换为base64
      const base64Audio = arrayBufferToBase64(mergedPcmData.buffer);

      // 按照百度官方示例构造请求数据
      const requestData = {
        format: 'pcm',
        rate: 16000,
        channel: 1,
        cuid: generateCuid(),
        token: await getBaiduToken(),
        speech: base64Audio,
        len: mergedPcmData.length * 2 // PCM数据长度（字节数）
      };

      console.log('🔄 发送请求到百度语音识别API...', {
        dataLength: base64Audio.length,
        sampleCount: mergedPcmData.length,
        cuid: requestData.cuid
      });

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/speech-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`服务器错误: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // 处理百度API响应
      if (result.err_no === 0) {
        console.log('✅ 百度语音识别成功:', result.result);
        return result.result[0]; // 百度返回的是数组，取第一个结果
      } else {
        throw new Error(`百度识别错误: ${result.err_msg} (${result.err_no})`);
      }

    } catch (error) {
      console.error('❌ 语音识别失败:', error);
      
      // 百度错误码映射
      const errorMap = {
        3300: '音频质量过差',
        3301: '音频质量过差',
        3302: '音频过短',
        3303: '音频解码失败',
        3304: '服务端处理失败',
        3305: '音频过长',
        3307: '音频数据问题',
        3308: '音频采样率不正确',
        3309: '音频位深不正确',
        3310: '音频声道数不正确',
        3311: '音频格式不支持',
        3312: '音频音量过小'
      };
      
      let userFriendlyError = error.message;
      
      // 如果是百度错误码，提供友好提示
      if (error.message.includes('err_no')) {
        const errNoMatch = error.message.match(/\((\d+)\)/);
        if (errNoMatch) {
          const errNo = errNoMatch[1];
          userFriendlyError = errorMap[errNo] || `识别失败 (错误码: ${errNo})`;
        }
      }
      
      throw new Error(userFriendlyError);
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  // 开始监听 - 优化版本
  const startListening = useCallback(async () => {
    if (listening || isProcessing) {
      console.log('⏸️ 已在监听中，跳过');
      return false;
    }

    if (!checkBrowserSupport()) {
      setError('浏览器不支持语音识别功能');
      return false;
    }

    // 设置启动超时（5秒）
    startTimeoutRef.current = setTimeout(() => {
      if (status === 'starting') {
        console.error('🚨 启动超时，强制清理资源');
        setError('启动超时，请重试');
        cleanupAudioResources();
      }
    }, 5000);

    try {
      console.log('🚀 开始语音识别流程...');
      setListening(true);
      setIsProcessing(false);
      setError(null);
      setTranscript('');
      setFinalTranscript('');
      setStatus('starting');
      pcmDataRef.current = [];
      audioLevelRef.current = 0;
      lastUpdateTimeRef.current = 0;
      isStoppingRef.current = false;

      // 重置语音活动检测
      voiceActivityRef.current = {
        hasSpeech: false,
        speechStartTime: 0,
        totalSamples: 0,
        silentSamples: 0,
        speechThreshold: 0.015,
        minSpeechDuration: 800
      };

      console.log('🎤 请求麦克风权限...');

      // 优化音频配置 - 提高语音质量
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          latency: 0
        },
        video: false
      }).catch(error => {
        console.error('麦克风权限获取失败:', error);
        throw error;
      });

      console.log('✅ 麦克风权限获取成功');
      setPermissionState('granted');
      streamRef.current = stream;

      console.log('🔧 设置音频处理...');
      await setupAudioProcessing(stream);

      // 清除启动超时
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }

      setStatus('listening');
      console.log('✅ 语音识别启动成功 - 优化配置');
      return true;

    } catch (error) {
      console.error('❌ 启动语音识别失败:', error);
      
      // 清除启动超时
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }

      let errorMessage = '启动失败，请重试';
      
      if (error.name === 'NotAllowedError') {
        setPermissionState('denied');
        errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到麦克风设备';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '浏览器不支持语音识别';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '麦克风设备被占用';
      }
      
      setError(errorMessage);
      setStatus('error');
      await cleanupAudioResources();
      return false;
    }
  }, [listening, isProcessing, checkBrowserSupport, setupAudioProcessing, cleanupAudioResources, status]);

  // 停止监听 - 增强版本
  const stopListening = useCallback(async () => {
    if (!listening || isStoppingRef.current) {
      console.log('⏸️ 未在监听中或正在停止，无需停止');
      return null;
    }

    console.log('🛑 立即停止语音录音...');
    setStatus('processing');
    setIsProcessing(true);
    isStoppingRef.current = true;

    try {
      // 立即停止音频处理
      processingActiveRef.current = false;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // 检查语音输入有效性
      const speechCheck = hasValidSpeechInput();
      if (!speechCheck.valid) {
        console.log(`❌ 语音输入无效: ${speechCheck.reason}`);
        throw new Error(speechCheck.reason);
      }

      // 立即处理当前收集的音频数据，不等待
      const dataLength = pcmDataRef.current.reduce((sum, data) => sum + data.length, 0);
      console.log(`📊 处理录音数据: ${dataLength} 采样点`);
      
      if (dataLength === 0) {
        throw new Error('没有检测到音频数据');
      }

      // 添加重试机制
      let retries = 2;
      let lastError = null;
      
      while (retries >= 0) {
        try {
          const result = await processAndSendAudio(pcmDataRef.current);
          
          if (result) {
            setFinalTranscript(result);
            setTranscript(result);
            options.onResult?.(result);
            console.log('✅ 语音识别成功:', result);
            return result;
          }
        } catch (error) {
          lastError = error;
          console.warn(`❌ 语音识别失败 (剩余重试次数: ${retries}):`, error.message);
          
          if (retries > 0 && error.message.includes('音频质量过低')) {
            // 等待短暂时间后重试
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
          } else {
            break;
          }
        }
      }
      
      throw lastError;

    } catch (error) {
      console.error('❌ 语音识别最终失败:', error);
      setError(error.message);
      options.onError?.(error);
      return null;

    } finally {
      await cleanupAudioResources();
    }
  }, [listening, processAndSendAudio, cleanupAudioResources, options, hasValidSpeechInput]);

  // 中止识别
  const abort = useCallback(() => {
    console.log('🚫 中止语音识别');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cleanupAudioResources();
  }, [cleanupAudioResources]);

  // 重置状态
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setError(null);
    setAudioLevel(0);
    audioLevelRef.current = 0;
  }, []);

  // 组件卸载清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanupAudioResources();
    };
  }, [cleanupAudioResources]);

  return {
    // 状态
    listening,
    transcript,
    interimTranscript: transcript,
    finalTranscript,
    error,
    isProcessing,
    status,
    audioLevel,
    permissionState,
    audioMethod,
    
    // 方法
    startListening,
    stopListening,
    abort,
    resetTranscript,
    
    // 支持信息
    isSupported: checkBrowserSupport(),
    browserSupportsSpeechRecognition: checkBrowserSupport(),
    platform: 'baidu'
  };
};

export default useBaiduSpeechRecognition;