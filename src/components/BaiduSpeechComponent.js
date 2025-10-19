// src/components/BaiduSpeechComponent.js
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import AudioConverter from './Utils/audioConverter';

const BaiduSpeechComponent = () => {
  const [status, setStatus] = useState('准备测试');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioFormat, setAudioFormat] = useState('正在检测...');
  const [conversionStatus, setConversionStatus] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const addLog = useCallback((message) => {
    console.log('Baidu Speech:', message);
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  }, []);

  // 检测浏览器支持的音频格式
  const detectAudioFormats = useCallback(() => {
    const formats = [
      'audio/wav',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    
    const supported = formats.filter(format => {
      return MediaRecorder.isTypeSupported(format);
    });
    
    if (supported.length > 0) {
      const bestFormat = supported.find(f => f.includes('wav')) || supported[0];
      setAudioFormat(bestFormat);
      addLog(`🎵 浏览器支持格式: ${supported.join(', ')}`);
      addLog(`🎵 使用最佳格式: ${bestFormat}`);
      return bestFormat;
    } else {
      setAudioFormat('默认格式');
      addLog('⚠️ 无法检测到支持的音频格式，使用默认格式');
      return null;
    }
  }, [addLog]);

  // 检测音频数据格式
  const detectAudioDataFormat = useCallback(async (audioBlob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      return AudioConverter.detectAudioFormat(uint8Array);
    } catch (error) {
      addLog(`❌ 音频格式检测失败: ${error.message}`);
      return '未知格式';
    }
  }, [addLog]);

  // 转换音频格式
  const convertAudioFormat = useCallback(async (audioBlob, originalFormat) => {
    if (originalFormat === 'WAV') {
      addLog('✅ 音频已经是WAV格式，无需转换');
      return audioBlob;
    }

    addLog(`🔄 正在将 ${originalFormat} 转换为 WAV 格式...`);
    setConversionStatus('转换音频格式中...');

    try {
      const wavBlob = await AudioConverter.webmToWav(audioBlob);
      addLog(`✅ 音频格式转换成功: ${originalFormat} -> WAV`);
      setConversionStatus('');
      return wavBlob;
    } catch (error) {
      addLog(`❌ 音频格式转换失败: ${error.message}`);
      setConversionStatus('转换失败');
      throw error;
    }
  }, [addLog]);

  // 测试音频数据格式
  const testAudioData = useCallback(async (audioBlob) => {
    addLog('🧪 测试音频数据格式...');
    
    try {
      const detectedFormat = await detectAudioDataFormat(audioBlob);
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let binary = '';
      const len = uint8Array.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      
      const base64Data = btoa(binary);
      
      const response = await fetch('/api/test-audio-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: base64Data,
          detected_format: detectedFormat
        })
      });

      const result = await response.json();
      
      if (result.success) {
        addLog(`✅ 音频格式: ${detectedFormat}`);
        addLog(`📊 数据长度: ${result.audio_data_info.length}`);
        addLog(`✅ Base64有效: ${result.audio_data_info.is_valid_base64}`);
        addLog(`✅ 解码成功: ${result.audio_data_info.decode_success}`);
        addLog(`📊 解码后大小: ${result.audio_data_info.decoded_length} 字节`);
        
        if (result.suggestions) {
          result.suggestions.forEach(suggestion => {
            addLog(`💡 ${suggestion}`);
          });
        }
        
        return { 
          success: true, 
          format: detectedFormat,
          needsConversion: !result.audio_data_info.is_baidu_supported
        };
      } else {
        addLog(`❌ 音频数据测试失败: ${result.error}`);
        return { success: false };
      }
    } catch (error) {
      addLog(`❌ 音频测试错误: ${error.message}`);
      return { success: false };
    }
  }, [addLog, detectAudioDataFormat]);

  // 初始化音频录制
  const initAudioRecording = useCallback(async () => {
    try {
      addLog('🎤 初始化音频录制...');
      
      // 使用百度推荐的音频参数
      const constraints = {
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      
      // 设置音频分析器用于电平显示
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // 更新音频电平
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = Math.round(sum / bufferLength);
        setAudioLevel(Math.min(100, average * 2));
        
        if (isRecording) {
          animationRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      // 检测并选择最佳音频格式
      const bestFormat = detectAudioFormats();
      
      // 创建 MediaRecorder
      let options = {};
      if (bestFormat) {
        options = { mimeType: bestFormat };
      }
      
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        addLog(`✅ 使用格式: ${mediaRecorderRef.current.mimeType}`);
      } catch (e) {
        addLog('⚠️ 使用默认 MediaRecorder');
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        addLog('⏹️ 录制停止，处理音频数据...');
        await processAudioData();
      };
      
      updateAudioLevel();
      addLog('✅ 音频录制初始化成功');
      return true;
      
    } catch (error) {
      addLog(`❌ 音频初始化失败: ${error.message}`);
      if (error.name === 'NotAllowedError') {
        addLog('🔒 请允许麦克风权限');
      }
      return false;
    }
  }, [addLog, isRecording, detectAudioFormats]);

  // 调用语音识别代理 API
  const callSpeechRecognitionAPI = useCallback(async (audioBlob, format = 'wav') => {
    addLog('📡 调用语音识别代理 API...');
    setStatus('识别中...');
    
    try {
      // 将音频转换为 ArrayBuffer，然后转换为 base64
      addLog('🔄 转换音频数据为base64...');
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 手动将 ArrayBuffer 转换为 base64
      let binary = '';
      const len = uint8Array.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      
      const base64Data = btoa(binary);
      
      addLog(`✅ 音频数据转换完成，base64长度: ${base64Data.length}`);
      addLog(`📊 发送音频数据: ${audioBlob.size} 字节`);
      addLog(`🎵 音频格式: ${format}`);

      // 调用本地代理接口
      const response = await fetch('/api/baidu-speech-recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: base64Data,
          format: format,
          rate: 16000,
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const result = data.text || '无识别结果';
        addLog(`✅ 识别成功: "${result}"`);
        setTranscript(result);
        setStatus('✅ 识别成功');
      } else {
        addLog(`❌ 识别失败: ${data.error}`);
        setStatus(`错误: ${data.error}`);
        if (data.suggestion) {
          addLog(`💡 建议: ${data.suggestion}`);
        }
      }
      
    } catch (error) {
      addLog(`❌ API 调用失败: ${error.message}`);
      setStatus(`网络错误: ${error.message}`);
    }
  }, [addLog]);

  // 处理音频数据并调用代理 API
  const processAudioData = useCallback(async () => {
    addLog('🔧 处理音频数据...');
    setStatus('处理音频中...');
    
    try {
      if (audioChunksRef.current.length === 0) {
        throw new Error('没有录制到音频数据');
      }

      const originalBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      addLog(`📦 原始音频Blob大小: ${originalBlob.size} 字节`);
      addLog(`📦 原始音频Blob类型: ${originalBlob.type}`);
      
      // 测试音频数据格式
      const testResult = await testAudioData(originalBlob);
      
      if (testResult.success) {
        let finalBlob = originalBlob;
        let finalFormat = 'wav';
        
        // 如果需要转换格式
        if (testResult.needsConversion) {
          addLog(`🔄 检测到 ${testResult.format} 格式需要转换为 WAV`);
          finalBlob = await convertAudioFormat(originalBlob, testResult.format);
          finalFormat = 'wav';
        } else {
          finalFormat = testResult.format.toLowerCase();
        }
        
        // 调用语音识别
        await callSpeechRecognitionAPI(finalBlob, finalFormat);
      } else {
        addLog('❌ 音频数据测试失败，跳过语音识别');
        setStatus('错误: 音频数据格式不正确');
      }
      
    } catch (error) {
      addLog(`❌ 音频处理失败: ${error.message}`);
      setStatus(`错误: ${error.message}`);
    }
  }, [addLog, testAudioData, convertAudioFormat, callSpeechRecognitionAPI]);

  // 开始录制
  const startRecording = useCallback(async () => {
    addLog('🎙️ 开始录音...');
    setStatus('录音中...请说话');
    setIsRecording(true);
    setTranscript('');
    setConversionStatus('');
    
    if (!mediaRecorderRef.current) {
      const initialized = await initAudioRecording();
      if (!initialized) return;
    }
    
    audioChunksRef.current = [];
    mediaRecorderRef.current.start(100);
    addLog('✅ 录音开始');
  }, [addLog, initAudioRecording]);

  // 停止录制
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      addLog('⏹️ 停止录音...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [addLog, isRecording]);

  // 测试百度语音识别
  const testBaiduRecognition = useCallback(async () => {
    addLog('🚀 开始百度语音识别测试');
    
    if (isRecording) {
      stopRecording();
      return;
    }
    
    await startRecording();
    
    // 8秒后自动停止
    setTimeout(() => {
      if (isRecording) {
        addLog('⏰ 自动停止录音（超时8秒）');
        stopRecording();
      }
    }, 8000);
  }, [addLog, isRecording, startRecording, stopRecording]);

  // 测试 API 连接
  const testAPIConnection = useCallback(async () => {
    addLog('🔗 测试百度API连接...');
    try {
      const response = await fetch('/api/speech-diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        addLog('✅ 百度API连接正常');
        if (result.diagnosis) {
          Object.keys(result.diagnosis).forEach(key => {
            if (key !== 'details') {
              addLog(`${result.diagnosis[key]} (${key})`);
            }
          });
        }
      } else {
        addLog(`❌ API连接测试失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 连接测试错误: ${error.message}`);
    }
  }, [addLog]);

  // 测试音频格式支持
  const testAudioFormats = useCallback(async () => {
    addLog('🎵 测试音频格式支持...');
    try {
      const response = await fetch('/api/test-audio-formats');
      const result = await response.json();
      
      if (result.supported_formats) {
        addLog('✅ 音频格式支持信息:');
        Object.keys(result.supported_formats).forEach(format => {
          const info = result.supported_formats[format];
          addLog(`   ${format}: ${info.rates.join(', ')} Hz - ${info.description}`);
        });
        
        if (result.recommendation) {
          addLog(`💡 推荐格式: ${result.recommendation.best_format}, ${result.recommendation.best_rate} Hz`);
          addLog(`💡 原因: ${result.recommendation.reason}`);
        }
      }
    } catch (error) {
      addLog(`❌ 音频格式测试失败: ${error.message}`);
    }
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // 清理资源
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanup();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording, cleanup]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">百度语音识别调试</h1>
      
      <div className="space-y-4 mb-6">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <strong>状态:</strong> {status}
          {conversionStatus && <div className="text-sm text-blue-600">{conversionStatus}</div>}
        </div>
        
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <strong>识别文本:</strong> {transcript || '无'}
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <strong>录音状态:</strong> {isRecording ? '🎙️ 录音中' : '未录音'}
        </div>

        <div className="p-3 bg-purple-50 border border-purple-200 rounded">
          <strong>音频电平:</strong> 
          <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
            <div 
              className="bg-purple-500 h-4 rounded-full transition-all duration-100"
              style={{ width: `${audioLevel}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-1">
            当前值: {Math.round(audioLevel)} | 说话时这个值应该变化
          </div>
        </div>

        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
          <strong>音频格式:</strong> {audioFormat}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <button
          onClick={testBaiduRecognition}
          className={`w-full py-3 rounded-lg font-bold transition-colors ${
            isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isRecording ? '停止录音并识别' : '开始录音识别'}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={testAPIConnection}
            className="py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
          >
            测试API连接
          </button>

          <button
            onClick={testAudioFormats}
            className="py-3 bg-indigo-500 text-white rounded-lg font-bold hover:bg-indigo-600 transition-colors"
          >
            测试音频格式
          </button>
        </div>

        <button
          onClick={clearLogs}
          className="w-full py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-colors"
        >
          清空日志
        </button>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
        <h3 className="font-bold mb-2">使用说明:</h3>
        <ul className="text-sm space-y-1">
          <li>• 点击"开始录音识别"按钮开始录音</li>
          <li>• 清晰说话，最长8秒自动停止</li>
          <li>• 或点击"停止录音并识别"手动停止</li>
          <li>• 确保麦克风权限已授权</li>
          <li>• 首次使用请先测试API连接</li>
          <li>• 如遇问题可测试音频格式支持</li>
          <li>• 系统会自动转换不支持的音频格式</li>
        </ul>
      </div>

      <div className="p-3 bg-black text-green-400 rounded max-h-64 overflow-y-auto">
        <h3 className="font-bold mb-2 text-white">调试日志</h3>
        {logs.map((log, index) => (
          <div key={index} className="text-xs font-mono mb-1">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BaiduSpeechComponent;