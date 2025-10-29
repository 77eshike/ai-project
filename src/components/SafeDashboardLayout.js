// src/components/SafeDashboardLayout.js
import DashboardLayout from './DashboardLayout';

// 安全的用户数据包装器
const SafeDashboardLayout = (props) => {
  // 确保用户数据始终有效
  const safeUser = {
    id: props.user?.id || 'unknown',
    name: props.user?.name || '用户',
    email: props.user?.email || '',
    image: props.user?.image || null
  };

  // 确保其他必要参数都有默认值
  const safeProps = {
    user: safeUser,
    activeTab: props.activeTab || 'overview',
    setActiveTab: props.setActiveTab || (() => {}),
    isMobile: props.isMobile || false,
    onLogout: props.onLogout || (() => {}),
    isLoggingOut: props.isLoggingOut || false,
    children: props.children
  };

  return <DashboardLayout {...safeProps} />;
};

export default SafeDashboardLayout;