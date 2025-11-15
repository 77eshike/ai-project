//src/components/ProjectPublishButton.js
import { useState } from 'react';

export default function ProjectPublishButton({ project, onPublishComplete }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedType, setSelectedType] = useState('STANDARD_PROJECT');

  const handlePublish = async () => {
    if (!project?.id) {
      alert('项目ID不存在');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: selectedType })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 项目发布成功:', result);
        if (onPublishComplete) {
          onPublishComplete(result.project);
        }
        alert('项目已成功发布为正式项目！');
      } else {
        throw new Error(result.error || '发布失败');
      }
    } catch (error) {
      console.error('❌ 项目发布失败:', error);
      alert(`发布失败: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // 只有待定项目且已完成AI格式化才显示发布按钮
  if (project?.projectType !== 'DRAFT_PROJECT' || project.formattingStatus !== 'COMPLETED') {
    return null;
  }

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <h3 className="text-lg font-semibold text-green-900">发布为正式项目</h3>
      
      {/* 项目类型选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择项目类型：
        </label>
        <select 
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isPublishing}
        >
          <option value="STANDARD_PROJECT">标准项目</option>
          <option value="TEAM_PROJECT">团队项目</option>
          <option value="RESEARCH_PROJECT">研究项目</option>
        </select>
      </div>

      {/* 发布按钮 */}
      <button
        onClick={handlePublish}
        disabled={isPublishing}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isPublishing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            发布中...
          </>
        ) : (
          <>
            📢 发布为正式项目
          </>
        )}
      </button>
      
      <p className="text-sm text-green-700">
        发布后项目将转为正式项目，开始招募团队成员。
      </p>
    </div>
  );
}