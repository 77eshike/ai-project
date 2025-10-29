import { useState, useEffect } from 'react';

export default function OverviewTab({ user }) {
  const [stats, setStats] = useState({
    totalProjects: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 模拟获取统计数据
  useEffect(() => {
    const fetchStats = () => {
      setIsLoading(true);
      // 模拟API延迟
      setTimeout(() => {
        setStats({
          totalProjects: 4,
          completed: 1,
          inProgress: 2,
          pending: 1
        });
        setIsLoading(false);
      }, 800);
    };

    fetchStats();
  }, []);

  // 模拟获取最近活动
  useEffect(() => {
    const fetchActivities = () => {
      // 模拟活动数据
      const activities = [
        {
          id: 1,
          type: 'project_create',
          title: '新项目创建',
          description: '创建了项目 "电商平台重构"',
          user: user.name,
          status: 'completed',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
          icon: 'fas fa-folder-plus'
        },
        {
          id: 2,
          type: 'task_complete',
          title: '任务完成',
          description: '完成了 "用户认证模块" 的开发',
          user: user.name,
          status: 'completed',
          time: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4小时前
          icon: 'fas fa-check-circle'
        },
        {
          id: 3,
          type: 'analysis',
          title: '数据分析任务',
          description: '开始进行用户行为数据分析',
          user: user.name,
          status: 'in-progress',
          time: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5小时前
          icon: 'fas fa-chart-line'
        },
        {
          id: 4,
          type: 'issue',
          title: '问题报告',
          description: '报告了支付接口的兼容性问题',
          user: user.name,
          status: 'pending',
          time: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8小时前
          icon: 'fas fa-exclamation-triangle'
        }
      ];
      
      setRecentActivities(activities);
    };

    fetchActivities();
  }, [user.name]);

  // 格式化时间显示
  const formatTime = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 计算项目完成百分比
  const completionPercentage = stats.totalProjects > 0 
    ? Math.round((stats.completed / stats.totalProjects) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* 欢迎卡片 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden shadow rounded-lg text-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white bg-opacity-20 rounded-full p-3">
              <i className="fas fa-user text-white text-2xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg leading-6 font-medium">欢迎回来, {user.name}!</h3>
              <p className="mt-1 opacity-90">您已成功登录AI项目平台控制台。开始探索各种功能吧！</p>
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors">
              查看项目
            </button>
            <button className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-30 transition-colors">
              创建新项目
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            title: '项目总数', 
            value: stats.totalProjects, 
            color: 'blue', 
            icon: 'project-diagram',
            description: '所有项目数量'
          },
          { 
            title: '已完成', 
            value: stats.completed, 
            color: 'green', 
            icon: 'check-circle',
            description: '已完成项目'
          },
          { 
            title: '进行中', 
            value: stats.inProgress, 
            color: 'yellow', 
            icon: 'clock',
            description: '进行中的项目'
          },
          { 
            title: '待处理', 
            value: stats.pending, 
            color: 'red', 
            icon: 'exclamation-triangle',
            description: '需要关注的项目'
          }
        ].map((stat, index) => (
          <div 
            key={index} 
            className="bg-white overflow-hidden shadow rounded-lg transform transition-all duration-200 hover:shadow-md"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${
                  stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  stat.color === 'green' ? 'bg-green-100 text-green-600' :
                  stat.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <i className={`fas fa-${stat.icon} text-lg`}></i>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stat.value}</dd>
                    <dt className="text-xs text-gray-400 mt-1">{stat.description}</dt>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 进度和活动区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 项目进度 */}
        <div className="lg:col-span-1 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">项目进度</h3>
            <p className="mt-1 text-sm text-gray-500">整体项目完成情况</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">完成度</span>
              <span className="text-sm font-medium text-blue-600">{completionPercentage}%</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">已完成</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{stats.totalProjects - stats.completed}</div>
                <div className="text-sm text-gray-600">剩余</div>
              </div>
            </div>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">最近活动</h3>
              <p className="mt-1 text-sm text-gray-500">您最近的平台活动记录</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              查看全部
            </button>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {recentActivities.map(activity => (
                <li key={activity.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 rounded-md p-2 ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                      activity.status === 'in-progress' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      <i className={`${activity.icon} text-sm`}></i>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {activity.status === 'completed' ? '完成' : 
                             activity.status === 'in-progress' ? '进行中' : '待处理'}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <i className="fas fa-user mr-1.5"></i>
                        {activity.user}
                        <i className="fas fa-clock ml-3 mr-1.5"></i>
                        {formatTime(activity.time)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 快速操作卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-600 rounded-md p-2">
              <i className="fas fa-plus text-white"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-blue-900">创建新项目</h3>
              <p className="mt-1 text-xs text-blue-700">开始一个新的AI项目</p>
            </div>
          </div>
          <button className="mt-4 w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            立即创建
          </button>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-600 rounded-md p-2">
              <i className="fas fa-book text-white"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-green-900">查看知识库</h3>
              <p className="mt-1 text-xs text-green-700">浏览项目文档和资源</p>
            </div>
          </div>
          <button className="mt-4 w-full bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
            前往知识库
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-600 rounded-md p-2">
              <i className="fas fa-comments text-white"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-purple-900">AI助手</h3>
              <p className="mt-1 text-xs text-purple-700">获取项目建议和帮助</p>
            </div>
          </div>
          <button className="mt-4 w-full bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
            开始对话
          </button>
        </div>
      </div>
    </div>
  );
}