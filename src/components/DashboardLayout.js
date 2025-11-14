// src/components/DashboardLayout.js - 完整修复版本
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

const DashboardLayout = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  isMobile, 
  onLogout,
  isLoggingOut,
  availableTabs,
  tabConfig,
  children 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // 响应式侧边栏控制
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // 导航项组件
  const NavItem = ({ tab, icon, title }) => {
    const isActive = activeTab === tab;
    
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="mr-3 text-lg">{icon}</span>
        {title}
        {isActive && (
          <span className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></span>
        )}
      </button>
    );
  };

  // 移动端侧边栏遮罩
  const MobileOverlay = () => {
    if (!isMobile || !sidebarOpen) return null;
    
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 移动端遮罩 */}
      <MobileOverlay />
      
      {/* 侧边栏 */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI项目平台</h1>
              <p className="text-xs text-gray-500">智能助手</p>
            </div>
          </div>
          
          {/* 移动端关闭按钮 */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {Object.entries(availableTabs).map(([key, tab]) => (
            <NavItem
              key={tab}
              tab={tab}
              icon={tabConfig[tab]?.icon}
              title={tabConfig[tab]?.title}
            />
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {user?.image ? (
                <img
                  className="w-10 h-10 rounded-full"
                  src={user.image}
                  alt={user.name}
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || '用户'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            {/* 左侧：菜单按钮和面包屑 */}
            <div className="flex items-center space-x-4">
              {/* 移动端菜单按钮 */}
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
              {/* 面包屑 */}
              <div className="flex items-center space-x-2">
                <span className="text-lg">{tabConfig[activeTab]?.icon}</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  {tabConfig[activeTab]?.title}
                </h2>
              </div>
            </div>

            {/* 右侧：用户菜单 */}
            <div className="relative user-menu">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {user?.image ? (
                  <img
                    className="w-8 h-8 rounded-full"
                    src={user.image}
                    alt={user.name}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 用户下拉菜单 */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-40">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>
                  
                  <div className="py-2">
                    <Link href="/dashboard?tab=settings">
                      <a 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        账户设置
                      </a>
                    </Link>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-2">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      disabled={isLoggingOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {isLoggingOut ? '登出中...' : '退出登录'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;