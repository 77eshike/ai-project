// src/components/FormattingPreview.js
import React, { useState } from 'react';

const FormattingPreview = ({ project, onFormattingComplete }) => {
  const [viewMode, setViewMode] = useState('split'); // 'split', 'original', 'formatted'
  const [isFormatting, setIsFormatting] = useState(false);

  if (!project) return null;

  // 处理AI格式化
  const handleAIFormatting = async () => {
    if (!project?.id) return;
    
    setIsFormatting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'STANDARD' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ AI格式化成功');
        if (onFormattingComplete) {
          onFormattingComplete(result.project);
        }
      } else {
        throw new Error(result.error || '格式化失败');
      }
    } catch (error) {
      console.error('❌ AI格式化失败:', error);
      alert(`格式化失败: ${error.message}`);
    } finally {
      setIsFormatting(false);
    }
  };

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

      {/* 格式化状态和操作 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              project.formattingStatus === 'COMPLETED' ? 'bg-green-500' :
              project.formattingStatus === 'PROCESSING' ? 'bg-yellow-500' :
              project.formattingStatus === 'FAILED' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-sm font-medium">
              {project.formattingStatus === 'COMPLETED' && 'AI格式化已完成'}
              {project.formattingStatus === 'PROCESSING' && 'AI格式化处理中...'}
              {project.formattingStatus === 'FAILED' && 'AI格式化失败'}
              {project.formattingStatus === 'NOT_STARTED' && '尚未进行AI格式化'}
            </span>
          </div>
          
          {project.formattingStatus === 'NOT_STARTED' && (
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
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {project.content || '暂无内容'}
              </pre>
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

      {/* 格式化统计信息 */}
      {project.formattingStatus === 'COMPLETED' && project.aiFormattedContent && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">原始字符数:</span>
              <span className="ml-2 font-medium">
                {project.content?.length || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-600">格式化后字符数:</span>
              <span className="ml-2 font-medium">
                {project.aiFormattedContent.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">格式化模板:</span>
              <span className="ml-2 font-medium">
                {project.formattingTemplate || '默认'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">审核轮次:</span>
              <span className="ml-2 font-medium">
                第 {project.currentReviewRound || 1} 轮
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormattingPreview;