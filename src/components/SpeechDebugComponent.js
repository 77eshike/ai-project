// components/SpeechDebugComponent.js - 国内优化版
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const SpeechDebugComponent = () => {
  const [status, setStatus] = useState('准备测试');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState([]);
  const [serviceProvider, setServiceProvider] = useState('自动检测');
  const recognitionRef = useRef(null);

  const addLog = useCallback((message) => {
    console.log('Speech Debug:', message);
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  }, []);

  // 检测可用服务
  const detectAvailableServices = useCallback(() => {
    addLog('🔍 检测可用语音识别服务...');
    
    const services = [];
    
    // 检测浏览器内置 API
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      services.push('浏览器内置 (Google)');
      addLog('✅ 检测到浏览器内置语音识别 API');
    } else {
      addLog('❌ 浏览器不支持内置语音识别');
    }
    
    // 这里可以添加其他服务的检测逻辑
    services.push('Azure Speech Services');
    services.push('百度语音识别');
    services.push('科大讯飞');
    
    addLog(`📋 可用服务: ${services.join(', ')}`);
    return services;
  }, [addLog]);

  // 测试服务连通性
  const testServiceConnectivity = useCallback(async () => {
    addLog('🌐 测试服务连通性...');
    
    const testEndpoints = [
      { name: 'Google 服务', url: 'https://www.google.com' },
      { name: 'Azure 服务', url: 'https://eastus.api.cognitive.microsoft.com' },
      { name: '百度服务', url: 'https://vop.baidu.com' },
      { name: '讯飞服务', url: 'https://iat-api.xfyun.cn' }
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        await fetch(endpoint.url, { method: 'HEAD', mode: 'no-cors' });
        addLog(`✅ ${endpoint.name} - 可访问`);
      } catch (error) {
        addLog(`❌ ${endpoint.name} - 无法访问`);
      }
    }
  }, [addLog]);

  const testBasicRecognition = useCallback(() => {
    addLog('🚀 开始语音识别测试');
    setStatus('初始化中...');
    setTranscript('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('❌ 浏览器不支持语音识别');
      setStatus('错误: 浏览器不支持');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        addLog('🎉 语音识别已启动');
        setIsListening(true);
        setStatus('🎤 正在聆听...请说话');
      };

      recognition.onresult = (event) => {
        addLog(`📝 收到识别结果`);
        const result = event.results[0];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          addLog(`✅ 最终结果: "${text}"`);
          setTranscript(text);
          setStatus('✅ 识别成功');
        } else {
          addLog(`⏳ 临时结果: "${text}"`);
          setTranscript(text);
        }
      };

      recognition.onerror = (event) => {
        addLog(`❌ 识别错误: ${event.error}`);
        setStatus(`错误: ${event.error}`);
        setIsListening(false);
        
        if (event.error === 'network') {
          addLog('🌐 网络错误 - 建议使用国内语音服务提供商');
        }
      };

      recognition.onend = () => {
        addLog('🛑 识别会话结束');
        setIsListening(false);
        setStatus('识别结束');
      };

      addLog('▶️ 启动识别...');
      recognition.start();

    } catch (error) {
      addLog(`💥 初始化异常: ${error.message}`);
      setStatus(`初始化失败: ${error.message}`);
    }
  }, [addLog]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        addLog('🛑 手动停止识别');
      } catch (error) {
        addLog(`❌ 停止失败: ${error.message}`);
      }
    }
    setIsListening(false);
    setStatus('已停止');
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    detectAvailableServices();
    testServiceConnectivity();
  }, [detectAvailableServices, testServiceConnectivity]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">语音识别调试</h1>
      
      <div className="space-y-4 mb-6">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <strong>状态:</strong> {status}
        </div>
        
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <strong>识别文本:</strong> {transcript || '无'}
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <strong>监听状态:</strong> {isListening ? '🎤 正在监听' : '未监听'}
        </div>

        <div className="p-3 bg-purple-50 border border-purple-200 rounded">
          <strong>服务提供商:</strong> {serviceProvider}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <button
          onClick={testBasicRecognition}
          disabled={isListening}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-bold disabled:bg-gray-300"
        >
          {isListening ? '识别中...' : '基础语音识别测试'}
        </button>

        <button
          onClick={stopListening}
          disabled={!isListening}
          className="w-full py-3 bg-red-500 text-white rounded-lg font-bold disabled:bg-gray-300"
        >
          停止识别
        </button>

        <button
          onClick={detectAvailableServices}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold"
        >
          检测可用服务
        </button>

        <button
          onClick={clearLogs}
          className="w-full py-3 bg-gray-500 text-white rounded-lg font-bold"
        >
          清空日志
        </button>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
        <h3 className="font-bold mb-2">替代方案建议:</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>Azure Speech Services</strong> - 微软云服务，全球可用</li>
          <li>• <strong>百度语音识别</strong> - 国内服务，访问稳定</li>
          <li>• <strong>科大讯飞</strong> - 中文识别准确率高</li>
          <li>• <strong>本地识别</strong> - 完全离线，隐私保护</li>
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

export default SpeechDebugComponent;