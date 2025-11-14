// components/KnowledgeList.js - 修复版本（优化空状态）
import { useState } from 'react';
import KnowledgeCard from './KnowledgeCard';

export default function KnowledgeList({ items, onEdit, onViewDetail }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' 或 'list'

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">知识库为空</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          还没有任何知识点，开始创建第一个知识点来丰富您的知识库吧！
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建第一个知识点
          </button>
        </div>
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
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="网格视图"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="列表视图"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-4'
      }>
        {items.map((item) => (
          <KnowledgeCard 
            key={item.id} 
            item={item} 
            viewMode={viewMode}
            onEdit={onEdit}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>
    </div>
  );
}