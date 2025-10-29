// src/components/chat/LoadingIndicator.js - 增强版本
const LoadingIndicator = ({ message = "AI正在思考...", size = "default" }) => {
  const sizes = {
    small: {
      dot: "w-1.5 h-1.5",
      text: "text-xs"
    },
    default: {
      dot: "w-2 h-2",
      text: "text-sm"
    },
    large: {
      dot: "w-3 h-3",
      text: "text-base"
    }
  };

  const { dot, text } = sizes[size];

  return (
    <div className="flex justify-center items-center py-4">
      <div className="flex space-x-1">
        <div className={`${dot} bg-blue-400 rounded-full animate-bounce`}></div>
        <div className={`${dot} bg-blue-500 rounded-full animate-bounce`} style={{animationDelay: '0.1s'}}></div>
        <div className={`${dot} bg-blue-600 rounded-full animate-bounce`} style={{animationDelay: '0.2s'}}></div>
      </div>
      <span className={`ml-2 ${text} text-gray-600`}>{message}</span>
    </div>
  );
};

export default LoadingIndicator;