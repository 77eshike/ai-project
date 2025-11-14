// src/components/OverviewTab.js - 示例修复版本
export default function OverviewTab({ user }) {
  return (
    <div className="max-w-6xl mx-auto">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              欢迎回来，{user?.name || '用户'}！
            </h1>
            <p className="text-blue-100 text-lg">
              今天有什么计划？让我们开始使用 AI 助手吧！
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-blue-600 text-xl">💬</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">对话数量</p>
              <p className="text-2xl font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-green-600 text-xl">📁</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">项目数量</p>
              <p className="text-2xl font-semibold text-gray-900">5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-purple-600 text-xl">📚</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">知识库</p>
              <p className="text-2xl font-semibold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-orange-600 text-xl">⭐</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃天数</p>
              <p className="text-2xl font-semibold text-gray-900">28</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快速开始</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <span className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-blue-600">💬</span>
              </span>
              <div className="text-left">
                <p className="font-medium text-gray-900">开始新对话</p>
                <p className="text-sm text-gray-500">与 AI 助手进行对话</p>
              </div>
            </button>

            <button className="w-full flex items-center p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
              <span className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-green-600">📁</span>
              </span>
              <div className="text-left">
                <p className="font-medium text-gray-900">创建新项目</p>
                <p className="text-sm text-gray-500">开始一个新项目</p>
              </div>
            </button>

            <button className="w-full flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <span className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-purple-600">📚</span>
              </span>
              <div className="text-left">
                <p className="font-medium text-gray-900">管理知识库</p>
                <p className="text-sm text-gray-500">添加和管理知识内容</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
          <div className="space-y-4">
            <div className="flex items-center p-3 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm">💬</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">与 AI 助手的对话</p>
                <p className="text-xs text-gray-500">2分钟前</p>
              </div>
            </div>

            <div className="flex items-center p-3 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 text-sm">📁</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">项目 "网站重构" 已更新</p>
                <p className="text-xs text-gray-500">1小时前</p>
              </div>
            </div>

            <div className="flex items-center p-3 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-purple-600 text-sm">📚</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">添加了新的知识文档</p>
                <p className="text-xs text-gray-500">3小时前</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}