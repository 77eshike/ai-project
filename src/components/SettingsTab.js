// src/components/SettingsTab.js - 完整修复版本
import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function SettingsTab({ 
  user, 
  isLoggingOut, 
  handleLogout, 
  voiceEnabled, 
  toggleVoice 
}) {
  const [activeSection, setActiveSection] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // 这里添加保存用户信息的逻辑
      console.log('保存用户信息:', formData);
      setIsEditing(false);
      // 可以添加成功提示
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleDirectLogout = async () => {
    try {
      console.log('🚪 直接退出登录...');
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true 
      });
    } catch (error) {
      console.error('直接退出失败:', error);
      window.location.href = '/auth/signin';
    }
  };

  // 格式化日期显示
  const formatDate = (dateString) => {
    if (!dateString) return '从未登录';
    try {
      return new Date(dateString).toLocaleString('zh-CN');
    } catch (e) {
      return '日期格式错误';
    }
  };

  // 获取状态显示文本和颜色
  const getStatusInfo = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { text: '正常', color: 'green' };
      case 'INACTIVE':
        return { text: '未激活', color: 'yellow' };
      case 'SUSPENDED':
        return { text: '已暂停', color: 'red' };
      default:
        return { text: '未知', color: 'gray' };
    }
  };

  // 获取角色显示文本
  const getRoleText = (role) => {
    switch (role) {
      case 'ADMIN':
        return '管理员';
      case 'MODERATOR':
        return '版主';
      case 'USER':
        return '普通用户';
      default:
        return '用户';
    }
  };

  const statusInfo = getStatusInfo(user?.status);
  const roleText = getRoleText(user?.role);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">设置</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 侧边导航 */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {[
                { id: 'account', name: '账户设置', icon: '👤' },
                { id: 'preferences', name: '偏好设置', icon: '⚙️' },
                { id: 'privacy', name: '隐私安全', icon: '🔒' },
                { id: 'notifications', name: '通知设置', icon: '🔔' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </nav>
          </div>

          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {activeSection === 'account' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">账户设置</h2>
                
                <div className="space-y-6">
                  {/* 用户信息 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">个人信息</h3>
                    <div className="space-y-4">
                      {/* 头像和基本信息 */}
                      <div className="flex items-start space-x-4">
                        {user?.image ? (
                          <img
                            src={user.image}
                            alt="头像"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-2xl text-gray-500">
                              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                姓名
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  name="name"
                                  value={formData.name}
                                  onChange={handleInputChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <p className="text-gray-900">{user?.name || '未设置'}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                邮箱
                              </label>
                              <div className="flex items-center">
                                <p className="text-gray-900 mr-2">{user?.email}</p>
                                {user?.emailVerified ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    已验证
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    未验证
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 时间信息 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            账户创建时间
                          </label>
                          <p className="text-gray-900 text-sm">
                            {formatDate(user?.createdAt)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            最后登录时间
                          </label>
                          <p className="text-gray-900 text-sm">
                            {formatDate(user?.lastLoginAt)}
                          </p>
                        </div>
                      </div>

                      {/* 用户ID */}
                      <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          用户ID
                        </label>
                        <p className="text-gray-900 text-sm font-mono bg-gray-50 p-2 rounded">
                          {user?.id || '未知'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 账户状态 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">账户状态</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          角色
                        </label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user?.role === 'ADMIN' 
                            ? 'bg-purple-100 text-purple-800'
                            : user?.role === 'MODERATOR'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {roleText}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          状态
                        </label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusInfo.color === 'green' 
                            ? 'bg-green-100 text-green-800'
                            : statusInfo.color === 'yellow'
                            ? 'bg-yellow-100 text-yellow-800'
                            : statusInfo.color === 'red'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <div>
                      {isEditing ? (
                        <div className="space-x-3">
                          <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            保存更改
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          编辑信息
                        </button>
                      )}
                    </div>

                    {/* 退出登录按钮 */}
                    <div className="space-y-2">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full md:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoggingOut ? '退出中...' : '退出登录'}
                      </button>
                      <p className="text-xs text-gray-500 text-center md:text-right">
                        安全退出您的账户
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'preferences' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">偏好设置</h2>
                
                <div className="space-y-6">
                  {/* 语音设置 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">语音播报</h3>
                      <p className="text-sm text-gray-500">启用AI回复的语音播报功能</p>
                    </div>
                    <button
                      onClick={toggleVoice}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        voiceEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          voiceEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 主题设置 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">主题偏好</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['浅色', '深色', '自动'].map((theme) => (
                        <button
                          key={theme}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:border-blue-500 transition-colors"
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">隐私安全</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">数据导出</h3>
                      <p className="text-sm text-gray-500">导出您的个人数据</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                      导出数据
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">账户删除</h3>
                      <p className="text-sm text-gray-500">永久删除您的账户和所有数据</p>
                    </div>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm">
                      删除账户
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">通知设置</h2>
                <div className="space-y-4">
                  {[
                    { name: '邮箱通知', description: '接收重要通知和更新', enabled: true },
                    { name: '推送通知', description: '接收实时推送通知', enabled: false },
                    { name: '营销信息', description: '接收产品更新和优惠信息', enabled: false },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          item.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            item.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}