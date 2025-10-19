// components/KnowledgeCard.js (修复标题显示问题)
import { useKnowledge } from '../contexts/KnowledgeContext';

// 标题截断工具函数
const truncateTitle = (title, maxLength = 60) => {
  if (!title) return '未命名知识点';
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

export default function KnowledgeCard({ item, viewMode, onEdit }) {
  const { deleteKnowledge } = useKnowledge();
  
  const handleDelete = () => {
    if (window.confirm('确定要删除这个知识点吗？此操作不可撤销。')) {
      deleteKnowledge(item.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-min-w-0">
            {/* 修复列表视图标题 */}
            <h3 
              className="kb-title-fix font-medium text-gray-800 text-lg break-words-safe"
              title={item.title}
            >
              {truncateTitle(item.title, 70)}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {item.category}
              </span>
              
              {item.tags.split(',').map((tag, i) => (
                <span key={i} className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                  {tag.trim()}
                </span>
              ))}
            </div>
            
            <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
          </div>
          
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => onEdit(item)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="编辑"
            >
              <i className="fas fa-edit"></i>
            </button>
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 p-1"
              title="删除"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          <span>{item.source}</span>
        </div>
      </div>
    );
  }

  // 网格视图
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        {/* 修复网格视图标题 */}
        <h3 
          className="kb-title-fix font-medium text-gray-800 break-words-safe flex-min-w-0 mr-2"
          title={item.title}
        >
          {truncateTitle(item.title, 50)}
        </h3>
        
        <div className="flex space-x-1">
          <button
            onClick={() => onEdit(item)}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="编辑"
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 p-1"
            title="删除"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {item.category}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 flex-1 mb-3 line-clamp-3">{item.content}</p>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {item.tags.split(',').map((tag, i) => (
          <span key={i} className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
            {tag.trim()}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500 mt-auto">
        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        <span>{item.source}</span>
      </div>
    </div>
  );
}