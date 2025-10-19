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
  UserCircleIcon
} from '@heroicons/react/24/outline';

export default function DashboardLayout({
  user,
  activeTab,
  setActiveTab,
  isMobile,
  onLogout,
  isLoggingOut,
  children
}) {
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: '新消息', content: '您有一个新的项目邀请', time: '2分钟前', read: false },
    { id: 2, title: '系统更新', content: '系统将在今晚进行维护', time: '1小时前', read: true },
    { id: 3, title: '项目完成', content: '您的项目"AI助手"已完成', time: '3小时前', read: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  
  // 点击外部关闭用户菜单和通知
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
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
  
  // 移动端点击内容区域关闭侧边栏
  const handleContentClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const navigation = [
    { id: 'overview', name: '总览', icon: ChartBarIcon },
    { id: 'projects', name: '项目', icon: FolderIcon },
    { id: 'chat', name: '聊天', icon: ChatBubbleLeftRightIcon },
    { id: 'knowledge', name: '知识库', icon: BookOpenIcon },
    { id: 'settings', name: '设置', icon: Cog6ToothIcon },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* 移动端侧边栏遮罩 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 md:hidden"
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
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                }`}
              >
                <item.icon
                  className={`mr-3 h-6 w-6 ${
                    activeTab === item.id
                      ? 'text-blue-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </button>
            ))}
          </nav>
          
          {/* 用户信息面板 */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user?.image ? (
                  <img
                    className="h-10 w-10 rounded-full"
                    src={user.image}
                    alt={user?.name || '用户'}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name || '用户'}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>
            </div>
            
            {/* 侧边栏底部注销按钮 */}
            <button
              onClick={onLogout}
              disabled={isLoggingOut}
              className="mt-4 group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
              {isLoggingOut ? '退出中...' : '退出登录'}
            </button>
          </div>
        </div>
      </div>
      
      {/* 主内容区域 */}
      <div 
        className="flex-1 flex flex-col overflow-hidden"
        onClick={handleContentClick}
      >
        {/* 顶部导航 */}
        <header className="bg-white shadow-sm z-10 relative">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              {isMobile && (
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 mr-2 transition-colors"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              )}
              
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="search"
                  placeholder="搜索项目、任务或文档..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 通知按钮 */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors relative"
                >
                  <BellIcon className="h-6 w-6" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 -mt-1 -mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-xs text-white items-center justify-center">
                        {unreadNotificationsCount}
                      </span>
                    </span>
                  )}
                </button>
                
                {/* 通知下拉菜单 */}
                {showNotifications && (
                  <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">通知</h3>
                    </div>
                    <div className="py-1">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex justify-between">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <span className="text-xs text-gray-500">{notification.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                            {!notification.read && (
                              <div className="mt-1 text-xs text-blue-600">未读</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-sm text-gray-500">
                          暂无通知
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2 bg-gray-50">
                      <button className="text-xs text-blue-600 hover:text-blue-800">
                        查看所有通知
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 用户资料下拉菜单 */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="max-w-xs flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {user?.image ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.image}
                      alt={user?.name || '用户'}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="ml-2 hidden md:block">
                    <p className="text-sm font-medium text-gray-700">{user?.name || '用户'}</p>
                  </div>
                  <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-500" />
                </button>

                {/* 用户下拉菜单 */}
                {showUserMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50">
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-900">{user?.name || '用户'}</p>
                      <p className="text-sm font-medium text-gray-500 truncate">{user?.email || ''}</p>
                    </div>
                    <div className="py-1">
                      <a
                        href="#"
                        className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                        个人资料
                      </a>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={onLogout}
                        disabled={isLoggingOut}
                        className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}