import { useState, useEffect } from 'react';

export default function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      // 模拟API调用
      const mockProjects = [
        { id: 1, name: '智能电商平台', status: '进行中', progress: 65, members: ['A', 'B', 'C'], description: '重构现有电商平台，提升用户体验和性能' },
        { id: 2, name: '健康监测应用', status: '已完成', progress: 100, members: ['D', 'E'], description: '开发健康数据追踪和分析应用' },
        { id: 3, name: '在线教育平台', status: '进行中', progress: 45, members: ['F', 'G', 'H'], description: '构建互动式在线学习平台' },
        { id: 4, name: '智能家居系统', status: '待处理', progress: 10, members: ['I'], description: '开发智能家居控制和管理系统' }
      ];
      setProjects(mockProjects);
      
      // 更新统计
      setStats({
        totalProjects: mockProjects.length,
        completed: mockProjects.filter(p => p.status === '已完成').length,
        inProgress: mockProjects.filter(p => p.status === '进行中').length,
        pending: mockProjects.filter(p => p.status === '待处理').length
      });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">项目管理</h3>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <i className="fas fa-plus mr-2"></i>
            新建项目
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map(project => (
            <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{project.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  project.status === '已完成' ? 'bg-green-100 text-green-800' :
                  project.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {project.status}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{project.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex -space-x-2">
                  {project.members.map((member, index) => (
                    <div key={index} className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      {member}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-500">{project.progress}% 完成</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div 
                  className={`h-2 rounded-full ${
                    project.status === '已完成' ? 'bg-green-500' :
                    project.status === '进行中' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`} 
                  style={{width: `${project.progress}%`}}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>进度</span>
                <span>{project.progress}%</span>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <button className="flex-1 bg-gray-100 text-gray-700 py-1 px-2 rounded text-sm hover:bg-gray-200 transition-colors">
                  查看详情
                </button>
                <button className="flex-1 bg-blue-100 text-blue-700 py-1 px-2 rounded text-sm hover:bg-blue-200 transition-colors">
                  编辑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 项目统计 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">项目统计</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalProjects}</div>
            <div className="text-sm text-gray-600">总项目数</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">已完成</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">进行中</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">待处理</div>
          </div>
        </div>
      </div>
    </div>
  );
}