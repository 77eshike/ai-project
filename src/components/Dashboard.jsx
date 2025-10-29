// /src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { 
  FiHome, 
  FiPieChart, 
  FiUsers, 
  FiSettings,
  FiBell,
  FiMessageSquare,
  FiDatabase,
  FiCpu,
  FiTrendingUp,
  FiActivity,
  FiBox,
  FiStar
} from 'react-icons/fi';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState(3);
  const [isLoading, setIsLoading] = useState(true);

  // 模拟数据
  const statsData = {
    projects: 12,
    datasets: 5,
    models: 3,
    conversations: 28
  };

  const recentProjects = [
    { id: 1, name: '智能电商平台', progress: 65, status: 'active', members: 3 },
    { id: 2, name: '健康监测应用', progress: 40, status: 'active', members: 2 },
    { id: 3, name: '在线教育平台', progress: 20, status: 'draft', members: 1 },
    { id: 4, name: '智能家居系统', progress: 80, status: 'active', members: 4 }
  ];

  const activityFeed = [
    { id: 1, type: 'chat', message: 'AI完成了智能电商平台的需求分析', time: '2分钟前' },
    { id: 2, type: 'project', message: '健康监测应用数据集已上传', time: '1小时前' },
    { id: 3, type: 'model', message: '新模型训练完成，准确率92%', time: '3小时前' },
    { id: 4, type: 'system', message: '系统备份已完成', time: '昨天' }
  ];

  useEffect(() => {
    // 模拟加载数据
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FiCpu className="text-white text-lg" />
            </div>
            <span className="text-xl font-bold text-gray-800">191413AI</span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', icon: FiHome, label: '总览' },
            { id: 'projects', icon: FiPieChart, label: '项目' },
            { id: 'datasets', icon: FiDatabase, label: '数据集' },
            { id: 'models', icon: FiCpu, label: 'AI模型' },
            { id: 'chat', icon: FiMessageSquare, label: 'AI对话' },
            { id: 'team', icon: FiUsers, label: '团队' },
            { id: 'settings', icon: FiSettings, label: '设置' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">李</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">李明</p>
              <p className="text-xs text-gray-500 truncate">管理员</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">仪表盘总览</h1>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-500 hover:text-gray-700">
                <FiBell className="w-5 h-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FiBox}
              title="项目总数"
              value={statsData.projects}
              color="blue"
              trend={{ value: '+12%', isPositive: true }}
            />
            <StatCard
              icon={FiDatabase}
              title="数据集"
              value={statsData.datasets}
              color="green"
              trend={{ value: '+5%', isPositive: true }}
            />
            <StatCard
              icon={FiCpu}
              title="AI模型"
              value={statsData.models}
              color="purple"
              trend={{ value: '+8%', isPositive: true }}
            />
            <StatCard
              icon={FiMessageSquare}
              title="对话记录"
              value={statsData.conversations}
              color="orange"
              trend={{ value: '+23%', isPositive: true }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 最近项目 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">最近项目</h2>
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                  查看全部
                </button>
              </div>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>

            {/* 活动动态 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">最新动态</h2>
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                  查看全部
                </button>
              </div>
              <div className="space-y-4">
                {activityFeed.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">快速操作</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickAction
                icon={FiMessageSquare}
                title="开始新对话"
                description="与AI助手交流创意"
                color="blue"
                onClick={() => setActiveTab('chat')}
              />
              <QuickAction
                icon={FiBox}
                title="创建项目"
                description="启动新项目"
                color="green"
                onClick={() => console.log('创建项目')}
              />
              <QuickAction
                icon={FiDatabase}
                title="上传数据"
                description="添加训练数据集"
                color="purple"
                onClick={() => console.log('上传数据')}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard = ({ icon: Icon, title, value, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-3">
          <span className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value}
          </span>
          <span className="text-sm text-gray-500 ml-2">较上月</span>
        </div>
      )}
    </div>
  );
};

// 项目卡片组件
const ProjectCard = ({ project }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-800 truncate">{project.name}</h3>
        <div className="flex items-center space-x-4 mt-2">
          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[project.status]}`}>
            {project.status === 'active' ? '进行中' : '草稿'}
          </span>
          <span className="text-sm text-gray-500">{project.members}人参与</span>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${project.progress}%` }}
          ></div>
        </div>
        <span className="text-sm text-gray-600 w-8">{project.progress}%</span>
      </div>
    </div>
  );
};

// 活动项组件
const ActivityItem = ({ activity }) => {
  const iconMap = {
    chat: FiMessageSquare,
    project: FiBox,
    model: FiCpu,
    system: FiSettings
  };

  const Icon = iconMap[activity.type];

  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="p-2 bg-blue-100 rounded-lg">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{activity.message}</p>
        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
      </div>
    </div>
  );
};

// 快速操作组件
const QuickAction = ({ icon: Icon, title, description, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:shadow-md ${colorClasses[color]}`}
    >
      <div className="p-3 bg-white rounded-lg shadow-sm">
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-left">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
};

export default Dashboard;