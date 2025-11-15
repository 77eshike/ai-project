//src/components/OneClickAIButton.js
import { useState } from 'react';

export default function OneClickAIButton({ project, onFormatComplete }) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('STANDARD');

  const handleOneClickFormat = async () => {
    if (!project?.id) {
      alert('项目ID不存在');
      return;
    }

    setIsFormatting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ AI格式化成功:', result);
        if (onFormatComplete) {
          onFormatComplete(result.project);
        }
        alert('AI格式化完成！');
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

  // 只有待定项目才显示AI格式化按钮
  if (project?.projectType !== 'DRAFT_PROJECT') {
    return null;
  }

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-900">AI一键格式化</h3>
      
      {/* 模板选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择格式化模板：
        </label>
        <select 
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isFormatting}
        >
          <option value="STANDARD">标准商业文档</option>
          <option value="TECHNICAL">技术文档</option>
          <option value="ACADEMIC">学术论文</option>
        </select>
      </div>

      {/* 一键AI按钮 */}
      <button
        onClick={handleOneClickFormat}
        disabled={isFormatting || project.formattingStatus === 'PROCESSING'}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isFormatting || project.formattingStatus === 'PROCESSING' ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            AI正在格式化中...
          </>
        ) : (
          <>
            🚀 一键AI格式化排版
          </>
        )}
      </button>
      
      {/* 状态提示 */}
      {project.formattingStatus === 'COMPLETED' && (
        <div className="text-green-600 text-sm text-center">
          ✅ AI格式化已完成
        </div>
      )}
      {project.formattingStatus === 'FAILED' && (
        <div className="text-red-600 text-sm text-center">
          ❌ AI格式化失败，请重试
        </div>
      )}
    </div>
  );
}