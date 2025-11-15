// 新增：src/components/ProjectDetailHeader.js
import React from 'react';
import { useRouter } from 'next/router';
import ProjectStatusBadge from './ProjectStatusBadge';

const ProjectDetailHeader = ({ project, onBack }) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back(); // 默认返回上一页
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* 返回按钮 */}
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>返回</span>
          </button>

          {/* 项目标题和状态 */}
          <div className="border-l border-gray-300 pl-4">
            <h1 className="text-xl font-semibold text-gray-900">{project?.title || '未命名项目'}</h1>
            <div className="mt-1">
              <ProjectStatusBadge project={project} />
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="flex items-center space-x-3">
          {project?.projectType === 'DRAFT_PROJECT' && (
            <>
              <button
                onClick={() => router.push('/projects')}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                项目列表
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                刷新
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailHeader;