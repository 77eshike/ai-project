// components/KnowledgeFilters.js
import { useState } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

export default function KnowledgeFilters() {
  const { 
    searchQuery, 
    filters, 
    categories, 
    tags, 
    setSearchQuery, 
    setFilters 
  } = useKnowledge();
  
  const [tagInput, setTagInput] = useState('');

  const handleCategoryChange = (category) => {
    setFilters({ category });
  };

  const handleTagToggle = (tag) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    
    setFilters({ tags: newTags });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      setFilters({ tags: [...filters.tags, tagInput.trim()] });
    }
    setTagInput('');
  };

  const clearFilters = () => {
    setFilters({ category: '所有', tags: [] });
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索知识点..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 分类筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                checked={filters.category === '所有'}
                onChange={() => handleCategoryChange('所有')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2">所有分类</span>
            </label>
            
            {categories.map(category => (
              <label key={category} className="flex items-center">
                <input
                  type="radio"
                  checked={filters.category === category}
                  onChange={() => handleCategoryChange(category)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2">{category}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 标签筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {filters.tags.map(tag => (
              <span 
                key={tag} 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            ))}
          </div>
          
          <div className="flex">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="添加标签..."
              className="flex-1 border border-gray-300 rounded-l-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              className="bg-blue-600 text-white px-3 py-1 rounded-r-lg text-sm hover:bg-blue-700"
            >
              添加
            </button>
          </div>
        </div>
      </div>
      
      {/* 清除筛选按钮 */}
      {(searchQuery || filters.category !== '所有' || filters.tags.length > 0) && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <i className="fas fa-times mr-1"></i> 清除所有筛选
          </button>
        </div>
      )}
    </div>
  );
}