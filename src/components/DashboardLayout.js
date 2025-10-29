// src/components/DashboardLayout.js - 修复版本
import { useState, useEffect, useRef } from 'react';
import { 
  ChartBarIcon, 
  FolderIcon, 
  ChatBubbleLeftRightIcon, 
  BookOpenIcon, 
  Cog6ToothIcon,
  BellIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
  Bars3Icon,
  UserCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// 导入热修复
import { useDashboardHotfix } from './DashboardHotfix';

export default function DashboardLayout({
  user = { name: '用户', email: '' },
  activeTab = 'overview',
  setActiveTab = () => {},
  isMobile = false,
  onLogout = () => {},
  isLoggingOut = false,
  children
}) {
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const userMenuRef = useRef(null);
  const confirmRef = useRef(null);

  // 🔧 应用热修复
  useDashboardHotfix();

  // 安全的用户数据 - 增强版本
  const safeUser = useRef({
    id: user?.id || 'unknown',
    name: user?.name || '用户',
    email: user?.email || '',
    image: user?.image || null,
    role: user?.role || 'USER',
    isAuthenticated: user?.isAuthenticated !== false,
    stats: user?.stats || {
      projects: 0,
      conversations: 0,
      knowledgeItems: 0
    }
  }).current;

  // 安全的用户显示名称
  const displayName = safeUser.name || '用户';
  const displayEmail = safeUser.email || '';
  const displayInitial = displayName.charAt(0).toUpperCase();

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      try {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
          setShowUserMenu(false);
        }
        if (confirmRef.current && !confirmRef.current.contains(event.target)) {
          setShowLogoutConfirm(false);
        }
      } catch (error) {
        console.warn('🔧 DashboardLayout: 点击外部处理错误', error);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 根据设备类型自动切换侧边栏状态
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // 导航配置
  const navigation = [
    { id: 'overview', name: '总览', icon: ChartBarIcon },
    { id: 'projects', name: '项目', icon: FolderIcon },
    { id: 'chat', name: '聊天', icon: ChatBubbleLeftRightIcon },
    { id: 'knowledge', name: '知识库', icon: BookOpenIcon },
    { id: 'settings', name: '设置', icon: Cog6ToothIcon },
  ];

  // 安全的标签页切换
  const handleTabChange = (tabId) => {
    try {
      if (typeof setActiveTab === 'function') {
        setActiveTab(tabId);
      } else {
        console.warn('🔧 DashboardLayout: setActiveTab 不是函数');
      }
      if (isMobile) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('❌ 切换标签页错误:', error);
    }
  };

  // 安全的退出登录处理
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setShowUserMenu(false);
    try {
      if (typeof onLogout === 'function') {
        await onLogout();
      } else {
        console.warn('🔧 DashboardLayout: onLogout 不是函数，使用默认退出');
        // 默认退出行为
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin';
        }
      }
    } catch (error) {
      console.error('❌ 退出登录错误:', error);
      // 备用退出方案
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin?error=logout_failed';
      }
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // 修复：安全的图片错误处理函数
  const handleImageError = (event) => {
    try {
      // 隐藏失败的图片
      event.target.style.display = 'none';
      
      // 安全地显示备用头像
      const nextSibling = event.target.nextSibling;
      if (nextSibling && nextSibling.style) {
        nextSibling.style.display = 'flex';
      }
    } catch (error) {
      console.warn('🔧 DashboardLayout: 图片错误处理失败', error);
    }
  };

  // 安全的图片渲染
  const renderUserAvatar = () => {
    try {
      if (safeUser?.image) {
        return (
          <img
            className="h-10 w-10 rounded-full"
            src={safeUser.image}
            alt={displayName}
            onError={handleImageError}
          />
        );
      }
    } catch (error) {
      console.warn('🔧 DashboardLayout: 用户头像渲染错误', error);
    }

    // 默认头像
    return (
      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
        {displayInitial}
      </div>
    );
  };

  // 顶部导航栏用户头像渲染
  const renderTopBarAvatar = () => {
    try {
      if (safeUser?.image) {
        return (
          <img
            className="h-8 w-8 rounded-full"
            src={safeUser.image}
            alt={displayName}
            onError={handleImageError}
          />
        );
      }
    } catch (error) {
      console.warn('🔧 DashboardLayout: 顶部栏用户头像渲染错误', error);
    }

    return null;
  };

  // 安全的搜索处理
  const handleSearch = (event) => {
    event.preventDefault();
    // 搜索功能占位
    console.log('搜索功能:', event.target.value);
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* 退出确认对话框 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            ref={confirmRef}
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-auto"
          >
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">确认退出</h3>
            </div>
            <p className="text-gray-600 mb-6">您确定要退出登录吗？退出后将需要重新登录。</p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                {isLoggingOut ? '退出中...' : '确认退出'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 移动端侧边栏遮罩 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* 侧边栏 */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 fixed md:relative inset-y-0 left-0 z-50
        w-64 transform transition duration-300 ease-in-out
        bg-white border-r border-gray-200 flex flex-col
        shadow-lg md:shadow-none
      `}>
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="bg-blue-600 rounded-md p-1 mr-2">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">AI项目平台</h1>
          </div>
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="关闭侧边栏"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        
        {/* 侧边栏内容 */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* 导航菜单 */}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-colors w-full text-left ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                  }`}
                >
                  <IconComponent
                    className={`mr-3 h-6 w-6 ${
                      activeTab === item.id
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </button>
              );
            })}
          </nav>
          
          {/* 用户信息面板 */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center">
              <div className="flex-shrink-0 relative">
                {renderUserAvatar()}
                {/* 备用头像 - 在图片加载失败时显示 */}
                <div 
                  className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium absolute top-0 left-0"
                  style={{ display: safeUser?.image ? 'none' : 'flex' }}
                >
                  {displayInitial}
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 truncate" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate" title={displayEmail}>
                  {displayEmail}
                </p>
              </div>
            </div>
            
            {/* 侧边栏底部注销按钮 */}
            <button
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="mt-4 group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
              {isLoggingOut ? '退出中...' : '退出登录'}
            </button>
          </div>
        </div>
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <header className="bg-white shadow-sm z-10 relative">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              {isMobile && (
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 mr-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="切换侧边栏"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              )}
              
              {/* 搜索框 */}
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <form onSubmit={handleSearch}>
                  <input
                    type="search"
                    placeholder="搜索项目、任务或文档..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(e);
                      }
                    }}
                  />
                </form>
              </div>
            </div>
            
            {/* 用户操作区 */}
            <div className="flex items-center space-x-3">
              {/* 用户资料下拉菜单 */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="max-w-xs flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  aria-label="用户菜单"
                >
                  <div className="flex items-center">
                    <div className="relative">
                      {renderTopBarAvatar()}
                      {/* 默认头像 */}
                      <div 
                        className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium"
                        style={{ display: safeUser?.image ? 'none' : 'flex' }}
                      >
                        {displayInitial}
                      </div>
                    </div>
                    <div className="ml-2 hidden md:block">
                      <p className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                        {displayName}
                      </p>
                    </div>
                    <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-500" />
                  </div>
                </button>

                {/* 用户下拉菜单 */}
                {showUserMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50">
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-900 truncate" title={displayName}>
                        {displayName}
                      </p>
                      <p className="text-sm font-medium text-gray-500 truncate" title={displayEmail}>
                        {displayEmail}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleTabChange('settings');
                        }}
                        className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                        个人资料
                      </button>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogoutClick}
                        disabled={isLoggingOut}
                        className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                        <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                        {isLoggingOut ? '退出中...' : '退出登录'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-100">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 min-h-[500px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// 设置显示名称
DashboardLayout.displayName = 'DashboardLayout';