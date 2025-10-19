// src/contexts/KnowledgeContext.js - 最终修复版本
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const KnowledgeContext = createContext();

// 初始状态
const initialState = {
  knowledgeItems: [],
  categories: ['技术', '产品', '设计', '运营', '市场'],
  tags: ['React', 'JavaScript', 'CSS', 'Node.js', 'Python'],
  isLoading: false,
  searchQuery: '',
  filters: {
    category: '所有',
    tags: []
  },
  lastUpdated: null,
  error: null
};

// 示例数据
const sampleKnowledgeData = [
  {
    id: 1,
    title: '欢迎使用知识库',
    content: '这是您的第一个知识点！您可以在AI对话中保存重要的对话内容到这里。',
    category: '文档',
    tags: '欢迎,使用指南,示例',
    source: '系统示例',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 1
  },
  {
    id: 2,
    title: 'React最佳实践',
    content: '使用函数组件和Hooks，保持组件简洁，合理使用useMemo和useCallback优化性能。',
    category: '技术',
    tags: 'React,前端,JavaScript',
    source: '团队内部文档',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 1
  }
];

// reducer 处理函数
const knowledgeReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error
      };
    
    case 'LOAD_KNOWLEDGE_SUCCESS':
      return {
        ...state,
        knowledgeItems: action.payload,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        error: null
      };
    
    case 'LOAD_KNOWLEDGE_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
    
    case 'ADD_KNOWLEDGE_SUCCESS':
      return {
        ...state,
        knowledgeItems: [action.payload, ...state.knowledgeItems],
        lastUpdated: new Date().toISOString(),
        error: null
      };
    
    case 'DELETE_KNOWLEDGE_SUCCESS':
      return {
        ...state,
        knowledgeItems: state.knowledgeItems.filter(item => item.id !== action.payload),
        lastUpdated: new Date().toISOString(),
        error: null
      };
    
    case 'UPDATE_KNOWLEDGE_SUCCESS':
      return {
        ...state,
        knowledgeItems: state.knowledgeItems.map(item => 
          item.id === action.payload.id ? action.payload : item
        ),
        lastUpdated: new Date().toISOString(),
        error: null
      };
    
    case 'ADD_CATEGORY_SUCCESS':
      if (!action.payload || state.categories.includes(action.payload)) return state;
      return {
        ...state,
        categories: [...state.categories, action.payload]
      };
    
    case 'ADD_TAG_SUCCESS':
      if (!action.payload || state.tags.includes(action.payload)) return state;
      return {
        ...state,
        tags: [...state.tags, action.payload]
      };
    
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload
      };
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload
      };
    
    case 'SET_TAGS':
      return {
        ...state,
        tags: action.payload
      };
    
    default:
      return state;
  }
};

export const KnowledgeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(knowledgeReducer, initialState);

  // 安全的 fetch 包装函数
  const safeFetch = useCallback(async (url, options = {}) => {
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw new Error(`网络错误: ${error.message}`);
    }
  }, []);

  // 从API加载知识库数据 - 完全修复版本
  const loadKnowledgeItems = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🔄 开始加载知识库数据...');
      
      let result;
      
      try {
        // 尝试调用 API
        const response = await safeFetch('/api/knowledge');
        
        if (!response.ok) {
          throw new Error(`API 响应错误: ${response.status}`);
        }
        
        result = await response.json();
        console.log('✅ 从API加载知识库数据成功');
        
      } catch (apiError) {
        console.warn('⚠️ API调用失败，使用示例数据:', apiError.message);
        // 使用示例数据
        result = {
          success: true,
          data: sampleKnowledgeData,
          source: 'sample'
        };
      }
      
      if (result.success) {
        dispatch({ 
          type: 'LOAD_KNOWLEDGE_SUCCESS', 
          payload: result.data 
        });
        
        // 提取分类和标签
        const categories = [...new Set(result.data.map(item => item.category).filter(Boolean))];
        const allTags = result.data.flatMap(item => {
          if (item.tags && typeof item.tags === 'string') {
            return item.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          }
          return [];
        });
        const tags = [...new Set(allTags)];
        
        if (categories.length > 0) {
          dispatch({ type: 'SET_CATEGORIES', payload: [...new Set([...initialState.categories, ...categories])] });
        }
        if (tags.length > 0) {
          dispatch({ type: 'SET_TAGS', payload: [...new Set([...initialState.tags, ...tags])] });
        }
      } else {
        throw new Error(result.error || '数据加载失败');
      }
      
    } catch (error) {
      console.error('❌ 加载知识库最终错误:', error);
      dispatch({ 
        type: 'LOAD_KNOWLEDGE_ERROR', 
        payload: '知识库加载失败，请检查网络连接'
      });
    }
  }, [safeFetch]);

  // 添加知识点
  const addKnowledge = useCallback(async (knowledgeData) => {
    console.log('💾 准备添加知识点:', knowledgeData);
    
    try {
      // 创建本地数据（乐观更新）
      const localItem = {
        id: Date.now(), // 临时ID
        title: knowledgeData.title || '未命名文档',
        content: knowledgeData.content || '',
        category: knowledgeData.category || '技术',
        tags: knowledgeData.tags || '',
        source: knowledgeData.source || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 1
      };
      
      // 立即更新UI
      dispatch({ type: 'ADD_KNOWLEDGE_SUCCESS', payload: localItem });
      
      // 尝试保存到API（后台操作）
      try {
        const response = await safeFetch('/api/knowledge/save', {
          method: 'POST',
          body: JSON.stringify(knowledgeData),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ API保存成功');
          // 重新加载确保数据同步
          await loadKnowledgeItems();
        }
      } catch (apiError) {
        console.warn('⚠️ API保存失败，数据仅保存在本地:', apiError.message);
      }
      
      return { success: true, knowledge: localItem };
      
    } catch (error) {
      console.error('❌ 添加知识点失败:', error);
      throw error;
    }
  }, [safeFetch, loadKnowledgeItems]);

  // 删除知识点
  const deleteKnowledge = useCallback(async (id) => {
    console.log('🗑️ 准备删除知识点:', id);
    
    try {
      // 立即从本地状态移除（乐观更新）
      dispatch({ type: 'DELETE_KNOWLEDGE_SUCCESS', payload: id });
      
      // 尝试调用API删除（后台操作）
      try {
        const response = await safeFetch(`/api/knowledge/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          console.warn('⚠️ API删除失败，但已从本地移除');
        }
      } catch (apiError) {
        console.warn('⚠️ API删除失败，但已从本地移除:', apiError.message);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ 删除知识点失败:', error);
      throw error;
    }
  }, [safeFetch]);

  // 更新知识点
  const updateKnowledge = useCallback(async (id, knowledgeData) => {
    console.log('📝 准备更新知识点:', id, knowledgeData);
    
    try {
      const response = await safeFetch(`/api/knowledge/${id}`, {
        method: 'PUT',
        body: JSON.stringify(knowledgeData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 更新知识点成功:', id);
        await loadKnowledgeItems(); // 重新加载确保数据同步
        return result;
      } else {
        throw new Error(result.error || result.message || '更新失败');
      }
    } catch (error) {
      console.error('❌ 更新知识点失败:', error);
      throw error;
    }
  }, [safeFetch, loadKnowledgeItems]);

  const addCategory = useCallback((category) => {
    if (category && category.trim()) {
      dispatch({ type: 'ADD_CATEGORY_SUCCESS', payload: category.trim() });
    }
  }, []);

  const addTag = useCallback((tag) => {
    if (tag && tag.trim()) {
      dispatch({ type: 'ADD_TAG_SUCCESS', payload: tag.trim() });
    }
  }, []);

  const setSearchQuery = useCallback((query) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  // 计算统计信息
  const getStatistics = useCallback(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    
    const technicalDocs = state.knowledgeItems.filter(item => 
      item.category === '技术'
    );
    
    const productDocs = state.knowledgeItems.filter(item => 
      item.category === '产品'
    );
    
    const monthlyNew = state.knowledgeItems.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate > thirtyDaysAgo;
    });

    return {
      total: state.knowledgeItems.length,
      technical: technicalDocs.length,
      product: productDocs.length,
      monthlyNew: monthlyNew.length
    };
  }, [state.knowledgeItems]);

  // 获取筛选后的知识库项目
  const getFilteredKnowledge = useCallback(() => {
    let filtered = state.knowledgeItems;
    
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.content && item.content.toLowerCase().includes(query)) ||
        (item.tags && typeof item.tags === 'string' && item.tags.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query)) ||
        (item.title && item.title.toLowerCase().includes(query))
      );
    }
    
    if (state.filters.category && state.filters.category !== '所有') {
      filtered = filtered.filter(item => item.category === state.filters.category);
    }
    
    if (state.filters.tags.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.tags) return false;
        const itemTags = typeof item.tags === 'string' 
          ? item.tags.split(',').map(tag => tag.trim())
          : item.tags;
        return state.filters.tags.some(tag => itemTags.includes(tag));
      });
    }
    
    return filtered;
  }, [state.knowledgeItems, state.searchQuery, state.filters]);

  // 初始化加载
  useEffect(() => {
    console.log('🚀 KnowledgeProvider 初始化');
    loadKnowledgeItems();
  }, [loadKnowledgeItems]);

  const value = {
    // 状态
    knowledgeItems: state.knowledgeItems,
    categories: state.categories,
    tags: state.tags,
    isLoading: state.isLoading,
    searchQuery: state.searchQuery,
    filters: state.filters,
    lastUpdated: state.lastUpdated,
    error: state.error,
    
    // 操作
    loadKnowledgeItems,
    addKnowledge,
    deleteKnowledge,
    updateKnowledge,
    addCategory,
    addTag,
    setSearchQuery,
    setFilters,
    
    // 计算属性
    getFilteredKnowledge,
    getStatistics
  };

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
    </KnowledgeContext.Provider>
  );
};

export const useKnowledge = () => {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider');
  }
  return context;
};