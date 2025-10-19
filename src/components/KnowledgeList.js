// components/KnowledgeList.js
import { useState } from 'react';
import KnowledgeCard from './KnowledgeCard';

export default function KnowledgeList({ items, onEdit }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' 或 'list'

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <i className="fas fa-inbox text-4xl mb-3"></i>
        <p>暂无知识点</p>
        <p className="text-sm mt-1">创建第一个知识点或调整筛选条件</p>
      </div>
    );
  }

  return (
    <div>
      {/* 视图切换和统计 */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          共找到 {items.length} 条知识点
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`}
            title="网格视图"
          >
            <i className="fas fa-th"></i>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`}
            title="列表视图"
          >
            <i className="fas fa-list"></i>
          </button>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
        : 'space-y-4'
      }>
        {items.map((item) => (
          <KnowledgeCard 
            key={item.id} 
            item={item} 
            viewMode={viewMode}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}