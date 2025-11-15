// 新增：src/components/ProjectSettings.js
import React, { useState } from 'react';

const ProjectSettings = ({ project, onUpdate }) => {
  const [settings, setSettings] = useState({
    title: project?.title || '',
    description: project?.description || '',
    allowPublicComments: project?.allowPublicComments ?? true,
    visibility: project?.visibility || 'PRIVATE',
    currentReviewRound: project?.currentReviewRound || 1,
    maxReviewRounds: project?.maxReviewRounds || 3
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!project?.id) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const result = await response.json();
      
      if (result.success && onUpdate) {
        onUpdate(result.data.project);
        alert('项目设置已保存');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">项目设置</h3>

      {/* 基础信息 */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">基础信息</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            项目标题
          </label>
          <input
            type="text"
            value={settings.title}
            onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入项目标题"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            项目描述
          </label>
          <textarea
            value={settings.description}
            onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入项目描述"
          />
        </div>
      </div>

      {/* 协作设置 */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">协作设置</h4>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              允许公开评论
            </label>
            <p className="text-sm text-gray-500">
              允许非项目成员参与讨论
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.allowPublicComments}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              allowPublicComments: e.target.checked 
            }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            项目可见性
          </label>
          <select
            value={settings.visibility}
            onChange={(e) => setSettings(prev => ({ ...prev, visibility: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="PRIVATE">私有（仅项目成员可见）</option>
            <option value="TEAM">团队可见</option>
            <option value="PUBLIC">公开可见</option>
          </select>
        </div>
      </div>

      {/* 评审设置 */}
      {project?.projectType === 'DRAFT_PROJECT' && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">评审设置</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                当前评审轮次
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.currentReviewRound}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  currentReviewRound: parseInt(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大评审轮次
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxReviewRounds}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  maxReviewRounds: parseInt(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 危险操作 */}
      <div className="pt-6 border-t border-gray-200">
        <h4 className="font-medium text-red-700 mb-4">危险操作</h4>
        
        <div className="flex space-x-3">
          <button className="px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
            归档项目
          </button>
          <button className="px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
            删除项目
          </button>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default ProjectSettings;