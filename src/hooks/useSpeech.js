// src/hooks/useSpeech.js - 修复版本（包含表情符号过滤）
import { useMemo } from 'react';
import useBaiduSpeechRecognition from './useBaiduSpeechRecognition';
import { getForcedSpeechPlatform } from '../components/Utils/deviceUtils';

const useSpeech = (options = {}) => {
  const platform = useMemo(() => {
    const forced = getForcedSpeechPlatform();
    return options.platform || forced;
  }, [options.platform]);

  // 使用修复后的 useBaiduSpeechRecognition
  const speech = useBaiduSpeechRecognition({
    onResult: options.onResult,
    onError: options.onError,
  });

  // 返回统一的接口
  return {
    // 状态
    listening: speech.listening,
    transcript: speech.transcript,
    interimTranscript: speech.interimTranscript,
    finalTranscript: speech.finalTranscript,
    error: speech.error,
    isProcessing: speech.isProcessing,
    status: speech.status,
    permissionState: speech.permissionState,
    audioLevel: speech.audioLevel,
    
    // 方法
    startListening: speech.startListening,
    stopListening: speech.stopListening,
    resetTranscript: speech.resetTranscript,
    abort: speech.abort,
    
    // 平台信息
    platform: platform,
    isSupported: speech.isSupported,
    browserSupportsSpeechRecognition: speech.browserSupportsSpeechRecognition,
    audioMethod: speech.audioMethod,

    // 调试信息
    _debug: {
      detectedPlatform: platform,
      speechPlatform: speech.platform,
      forced: getForcedSpeechPlatform()
    }
  };
};

export default useSpeech;