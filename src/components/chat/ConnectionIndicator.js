// src/components/chat/ConnectionIndicator.js
const ConnectionIndicator = ({ status = 'connected' }) => {
  const statusConfig = {
    connected: { color: 'bg-green-500', text: '已连接' },
    connecting: { color: 'bg-yellow-500', text: '连接中' },
    disconnected: { color: 'bg-red-500', text: '已断开' },
    error: { color: 'bg-red-500', text: '错误' }
  };

  const config = statusConfig[status] || statusConfig.connected;

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`}></div>
      <span className="text-sm text-gray-600">{config.text}</span>
    </div>
  );
};

export default ConnectionIndicator;