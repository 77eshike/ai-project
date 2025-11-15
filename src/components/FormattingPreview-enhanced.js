// components/FormattingPreview-enhanced.js
import React, { useState } from 'react';

const FormattingPreviewEnhanced = ({ project, onFormattingComplete }) => {
  const [viewMode, setViewMode] = useState('split');
  const [isFormatting, setIsFormatting] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleAIFormatting = async () => {
    if (!project?.id) return;
    
    setIsFormatting(true);
    setError(null);
    
    try {
      console.log('🔄 开始AI格式化...');
      
      const response = await fetch(`/api/projects/${project.id}/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'STANDARD' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ AI格式化成功');
        setRetryCount(0);
        if (onFormattingComplete) {
          onFormattingComplete(result.project);
        }
      } else {
        throw new Error(result.error || '格式化失败');
      }
    } catch (error) {
      console.error('❌ AI格式化失败:', error);
      setError(error.message);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleAIFormatting();
  };

  const getFormattingStatusInfo = () => {
    const statusConfig = {
      'NOT_STARTED': {
        color: 'gray',
        icon: '⭕',
        message: '尚未进行AI格式化',
        action: '开始格式化'
      },
      'PROCESSING': {
        color: 'blue', 
        icon: '⏳',
        message: 'AI正在格式化内容...',
        action: '处理中'
      },
      'COMPLETED': {
        color: 'green',
        icon: '✅',
        message: 'AI格式化已完成',
        action: '重新格式化'
      },
      'FAILED': {
        color: 'red',
        icon: '❌',
        message: 'AI格式化失败',
        action: '重试格式化'
      }
    };
    
    return statusConfig[project.formattingStatus] || statusConfig.NOT_STARTED;
  };

  const statusInfo = getFormattingStatusInfo();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">AI格式化预览</h3>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'split'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            对比视图
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'original'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            原始内容
          </button>
          <button
            onClick={() => setViewMode('formatted')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'formatted'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            格式化后
          </button>
        </div>
      </div>

      {/* 状态和操作区域 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full bg-${statusInfo.color}-500`}></div>
            <div>
              <span className="font-medium">{statusInfo.icon} {statusInfo.message}</span>
              {project.formattingStatus === 'FAILED' && retryCount > 0 && (
                <span className="ml-2 text-sm text-orange-600">
                  (已重试 {retryCount} 次)
                </span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {project.formattingStatus === 'FAILED' && error && (
              <button
                onClick={handleRetry}
                disabled={isFormatting}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center"
              >
                {isFormatting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    重试中...
                  </>
                ) : (
                  '🔄 重新尝试'
                )}
              </button>
            )}
            
            {project.formattingStatus !== 'PROCESSING' && (
              <button
                onClick={handleAIFormatting}
                disabled={isFormatting}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                {isFormatting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    格式化中...
                  </>
                ) : (
                  '🚀 一键AI格式化'
                )}
              </button>
            )}
          </div>
        </div>

        {/* 错误信息显示 */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">格式化失败</h3>
                <div className="mt-1 text-sm text-red-700">
                  <p>{error}</p>
                  {error.includes('内容过短') && (
                    <p className="mt-1">
                      💡 建议：请编辑项目，添加更详细的项目描述（至少100字符）
                    </p>
                  )}
                  {error.includes('API') && (
                    <p className="mt-1">
                      💡 建议：检查AI服务配置或联系管理员
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 内容预览区域 */}
      <div className={`${
        viewMode === 'split' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''
      }`}>
        {/* 原始内容 */}
        {(viewMode === 'split' || viewMode === 'original') && (
          <div className="border border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
              <h4 className="font-medium text-gray-700">原始内容</h4>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {project.content ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {project.content}
                </pre>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无项目内容</p>
                  <p className="text-sm mt-1">请先编辑项目添加内容</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 格式化后内容 */}
        {(viewMode === 'split' || viewMode === 'formatted') && (
          <div className="border border-green-300 rounded-lg">
            <div className="bg-green-100 px-4 py-2 border-b border-green-300 flex justify-between items-center">
              <h4 className="font-medium text-green-800">AI格式化后</h4>
              {project.formattingTemplate && (
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                  模板: {project.formattingTemplate}
                </span>
              )}
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {project.aiFormattedContent ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: project.aiFormattedContent }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {project.formattingStatus === 'COMPLETED' 
                    ? '格式化内容为空' 
                    : '请先进行AI格式化'
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 帮助信息 */}
      {project.formattingStatus === 'FAILED' && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">💡 格式化失败帮助</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 确保项目内容足够详细（建议至少100字符）</li>
            <li>• 检查网络连接是否正常</li>
            <li>• 如多次失败，请联系技术支持</li>
            <li>• 您也可以手动编辑项目内容</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FormattingPreviewEnhanced;