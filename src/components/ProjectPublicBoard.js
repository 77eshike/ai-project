// src/components/ProjectPublicBoard.js - 完整修复版本
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ProjectStatusBadge from './ProjectStatusBadge';

const ProjectPublicBoard = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const query = filter !== 'ALL' ? `?filter=${filter}` : '';
      const response = await fetch(`/api/projects${query}`);
      
      if (response.ok) {
        const data = await response.json();
        const accessibleProjects = data.data?.projects || data.projects || [];
        setProjects(accessibleProjects);
      } else {
        console.error('获取项目失败:', response.status);
      }
    } catch (error) {
      console.error('获取项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 核心逻辑：所有未发布为正式项目的都是待定项目
  const draftProjects = projects.filter(p => p.projectType === 'DRAFT_PROJECT');
  
  // 已发布的项目根据状态分类
  const publishedProjects = projects.filter(p => p.projectType !== 'DRAFT_PROJECT');
  const recruitingProjects = publishedProjects.filter(p => p.status === 'RECRUITING');
  const inProgressProjects = publishedProjects.filter(p => p.status === 'IN_PROGRESS');
  const completedProjects = publishedProjects.filter(p => p.status === 'COMPLETED');

  const ProjectCard = ({ project }) => (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">
          {project.title}
        </h3>
      </div>
      
      <div className="mb-3">
        <ProjectStatusBadge project={project} />
      </div>
      
      <p className="text-gray-600 text-xs mb-3 line-clamp-2">
        {project.description || '暂无描述'}
      </p>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>👤 {project.owner?.name || '未知'}</span>
        <span>
          {project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '未知'}
        </span>
      </div>

      {/* 项目类型标识 */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <span className={`inline-block px-2 py-1 text-xs rounded ${
          project.projectType === 'DRAFT_PROJECT' 
            ? 'bg-orange-100 text-orange-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {project.projectType === 'DRAFT_PROJECT' ? '待定项目' : '正式项目'}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 筛选器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'ALL' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          全部项目
        </button>
        <button
          onClick={() => setFilter('DRAFT')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'DRAFT' 
              ? 'bg-orange-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          待定项目 ({draftProjects.length})
        </button>
        <button
          onClick={() => setFilter('RECRUITING')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'RECRUITING' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          招募中 ({recruitingProjects.length})
        </button>
        <button
          onClick={() => setFilter('IN_PROGRESS')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'IN_PROGRESS' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          进行中 ({inProgressProjects.length})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'COMPLETED' 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          已完成 ({completedProjects.length})
        </button>
      </div>

      {/* 看板布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 待定项目区 */}
        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-orange-800">待定项目区</h2>
            <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-sm">
              {draftProjects.length}
            </span>
          </div>
          <p className="text-sm text-orange-600 mb-4">
            🔧 未发布为正式项目的都在这里，欢迎参与讨论和改进
          </p>
          <div className="space-y-4">
            {draftProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
            {draftProjects.length === 0 && (
              <div className="text-center py-8 text-orange-500 text-sm">
                暂无待定项目
              </div>
            )}
          </div>
        </div>

        {/* 招募中项目区 */}
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-green-800">招募中项目区</h2>
            <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-sm">
              {recruitingProjects.length}
            </span>
          </div>
          <p className="text-sm text-green-600 mb-4">
            👥 正式项目招募成员，欢迎加入团队
          </p>
          <div className="space-y-4">
            {recruitingProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
            {recruitingProjects.length === 0 && (
              <div className="text-center py-8 text-green-500 text-sm">
                暂无招募中项目
              </div>
            )}
          </div>
        </div>

        {/* 进行中项目区 */}
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-purple-800">进行中项目区</h2>
            <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-sm">
              {inProgressProjects.length}
            </span>
          </div>
          <p className="text-sm text-purple-600 mb-4">
            🚀 项目执行进展，跟踪最新动态
          </p>
          <div className="space-y-4">
            {inProgressProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
            {inProgressProjects.length === 0 && (
              <div className="text-center py-8 text-purple-500 text-sm">
                暂无进行中项目
              </div>
            )}
          </div>
        </div>

        {/* 已完成项目区 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-gray-800">已完成项目区</h2>
            <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-sm">
              {completedProjects.length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            ✅ 项目成果展示，总结经验教训
          </p>
          <div className="space-y-4">
            {completedProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
            {completedProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无已完成项目
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPublicBoard;