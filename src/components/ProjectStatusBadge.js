// src/components/ProjectStatusBadge.js - 完整修复版本
export default function ProjectStatusBadge({ project }) {
  if (!project) return null;

  const statusConfig = {
    // 待定项目状态
    DRAFT: { color: 'bg-gray-100 text-gray-800', label: '草稿', icon: '📝' },
    IN_REVIEW: { color: 'bg-blue-100 text-blue-800', label: '评审中', icon: '👀' },
    FINALIZING: { color: 'bg-purple-100 text-purple-800', label: '定稿中', icon: '✍️' },
    
    // 正式项目状态
    RECRUITING: { color: 'bg-green-100 text-green-800', label: '招募中', icon: '👥' },
    IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', label: '进行中', icon: '🚀' },
    COMPLETED: { color: 'bg-green-100 text-green-800', label: '已完成', icon: '✅' },
    ARCHIVED: { color: 'bg-gray-100 text-gray-800', label: '已归档', icon: '📁' },
    FAILED: { color: 'bg-red-100 text-red-800', label: '已失败', icon: '❌' }
  };

  const typeConfig = {
    DRAFT_PROJECT: { color: 'bg-orange-100 text-orange-800', label: '待定项目', icon: '🔧' },
    STANDARD_PROJECT: { color: 'bg-blue-100 text-blue-800', label: '标准项目', icon: '📋' },
    TEAM_PROJECT: { color: 'bg-purple-100 text-purple-800', label: '团队项目', icon: '👥' },
    RESEARCH_PROJECT: { color: 'bg-green-100 text-green-800', label: '研究项目', icon: '🔬' }
  };

  const status = statusConfig[project.status] || statusConfig.DRAFT;
  const type = typeConfig[project.projectType] || typeConfig.STANDARD_PROJECT;

  return (
    <div className="flex flex-wrap gap-2">
      {/* 项目类型徽章 */}
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${type.color}`}>
        <span className="mr-1">{type.icon}</span>
        {type.label}
      </span>
      
      {/* 项目状态徽章 */}
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
        <span className="mr-1">{status.icon}</span>
        {status.label}
      </span>
      
      {/* AI格式化状态 */}
      {project.formattingStatus && project.formattingStatus !== 'NOT_STARTED' && (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          project.formattingStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
          project.formattingStatus === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
          project.formattingStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {project.formattingStatus === 'COMPLETED' && '✅ 已格式化'}
          {project.formattingStatus === 'PROCESSING' && '⏳ 格式化中'}
          {project.formattingStatus === 'FAILED' && '❌ 格式化失败'}
        </span>
      )}
    </div>
  );
}