// src/contexts/KnowledgeContext.js - 修复更新逻辑版本
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
  error: null,
  projectGeneration: {
    isGenerating: false,
    currentKnowledge: null,
    error: null
  },
  editingKnowledge: null
};

// 示例数据
const sampleKnowledgeData = [
  {
    id: 'sample-1',
    title: '欢迎使用知识库',
    content: '这是您的第一个知识点！您可以在AI对话中保存重要的对话内容到这里。',
    category: '文档',
    tags: '欢迎,使用指南,示例',
    source: '系统示例',
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
      const updatedItems = state.knowledgeItems.map(item => 
        item.id === action.payload.id ? { ...item, ...action.payload } : item
      );
      return {
        ...state,
        knowledgeItems: updatedItems,
        editingKnowledge: null,
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
    
    case 'SET_EDITING_KNOWLEDGE':
      return {
        ...state,
        editingKnowledge: action.payload
      };
    
    case 'CLEAR_EDITING_KNOWLEDGE':
      return {
        ...state,
        editingKnowledge: null
      };
    
    case 'PROJECT_GENERATION_START':
      return {
        ...state,
        projectGeneration: {
          isGenerating: true,
          currentKnowledge: action.payload,
          error: null
        }
      };
    
    case 'PROJECT_GENERATION_SUCCESS':
      return {
        ...state,
        projectGeneration: {
          isGenerating: false,
          currentKnowledge: null,
          error: null
        }
      };
    
    case 'PROJECT_GENERATION_ERROR':
      return {
        ...state,
        projectGeneration: {
          isGenerating: false,
          currentKnowledge: null,
          error: action.payload
        }
      };
    
    case 'PROJECT_GENERATION_RESET':
      return {
        ...state,
        projectGeneration: {
          isGenerating: false,
          currentKnowledge: null,
          error: null
        }
      };
    
    default:
      return state;
  }
};

export const KnowledgeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(knowledgeReducer, initialState);

  // 优化的安全 fetch 函数
  const safeFetch = useCallback(async (url, options = {}) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请稍后重试');
      }
      throw error;
    }
  }, []);

  // 从API加载知识库数据
  const loadKnowledgeItems = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('🔄 开始加载知识库数据...');
      
      let result;
      
      try {
        const response = await safeFetch('/api/knowledge');
        
        if (!response.ok) {
          throw new Error(`API 响应错误: ${response.status}`);
        }
        
        result = await response.json();
        console.log('✅ 从API加载知识库数据成功:', {
          count: result.data?.length,
          success: result.success
        });
        
      } catch (apiError) {
        console.warn('⚠️ API调用失败，使用示例数据:', apiError.message);
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
          dispatch({ 
            type: 'SET_CATEGORIES', 
            payload: [...new Set([...initialState.categories, ...categories])] 
          });
        }
        if (tags.length > 0) {
          dispatch({ 
            type: 'SET_TAGS', 
            payload: [...new Set([...initialState.tags, ...tags])] 
          });
        }
      } else {
        throw new Error(result.error || '数据加载失败');
      }
      
    } catch (error) {
      console.error('❌ 加载知识库最终错误:', error);
      dispatch({ 
        type: 'LOAD_KNOWLEDGE_ERROR', 
        payload: error.message || '知识库加载失败，请检查网络连接'
      });
    }
  }, [safeFetch]);

  // 添加知识点
  const addKnowledge = useCallback(async (knowledgeData) => {
    console.log('💾 准备添加知识点:', knowledgeData);
    
    try {
      const localItem = {
        id: `temp-${Date.now()}`,
        title: knowledgeData.title || '未命名文档',
        content: knowledgeData.content || '',
        category: knowledgeData.category || '技术',
        tags: knowledgeData.tags || '',
        source: knowledgeData.source || '用户添加',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 1
      };
      
      dispatch({ type: 'ADD_KNOWLEDGE_SUCCESS', payload: localItem });
      
      try {
        const response = await safeFetch('/api/knowledge/save', {
          method: 'POST',
          body: JSON.stringify(knowledgeData),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ API保存成功');
          await loadKnowledgeItems();
        } else {
          console.warn('⚠️ API保存失败，数据仅保存在本地');
        }
      } catch (apiError) {
        console.warn('⚠️ API保存失败，数据仅保存在本地:', apiError.message);
      }
      
      return { success: true, knowledge: localItem };
      
    } catch (error) {
      console.error('❌ 添加知识点失败:', error);
      await loadKnowledgeItems();
      throw error;
    }
  }, [safeFetch, loadKnowledgeItems]);

  // 删除知识点
  const deleteKnowledge = useCallback(async (id) => {
    console.log('🗑️ 准备删除知识点:', id);
    
    try {
      if (id.startsWith('temp-')) {
        dispatch({ type: 'DELETE_KNOWLEDGE_SUCCESS', payload: id });
        return { success: true };
      }
      
      const itemToDelete = state.knowledgeItems.find(item => item.id === id);
      dispatch({ type: 'DELETE_KNOWLEDGE_SUCCESS', payload: id });
      
      try {
        const response = await safeFetch(`/api/knowledge/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`删除失败: ${response.status}`);
        }
        
        console.log('✅ API删除成功');
        return { success: true };
        
      } catch (apiError) {
        console.warn('⚠️ API删除失败，数据仅从本地移除:', apiError.message);
        return { success: true, localOnly: true };
      }
      
    } catch (error) {
      console.error('❌ 删除知识点失败:', error);
      await loadKnowledgeItems();
      throw error;
    }
  }, [safeFetch, state.knowledgeItems, loadKnowledgeItems]);

  // 在 KnowledgeContext.js 中更新 updateKnowledge 函数
const updateKnowledge = useCallback(async (id, knowledgeData) => {
  console.log('📝 准备更新知识点:', { id, knowledgeData });
  
  try {
    // 如果是临时ID，直接更新本地数据
    if (id.startsWith('temp-')) {
      const updatedItem = {
        ...state.knowledgeItems.find(item => item.id === id),
        ...knowledgeData,
        updatedAt: new Date().toISOString()
      };
      dispatch({ type: 'UPDATE_KNOWLEDGE_SUCCESS', payload: updatedItem });
      return { success: true, knowledge: updatedItem };
    }

    console.log('🔄 发送API更新请求...');
    const response = await safeFetch(`/api/knowledge/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(knowledgeData),
    });
    
    console.log('📨 API响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ API错误响应:', errorData);
      } catch (parseError) {
        console.error('❌ API响应解析失败:', parseError);
        errorData = { 
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: '无法解析错误响应'
        };
      }
      
      // 提供更具体的错误信息
      const errorMessage = errorData.error || errorData.details || `更新失败: ${response.status}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ API更新成功响应:', result);
    
    if (result.success) {
      console.log('✅ API更新成功，更新本地状态');
      // 更新本地状态
      dispatch({ type: 'UPDATE_KNOWLEDGE_SUCCESS', payload: result.data });
      return { success: true, knowledge: result.data };
    } else {
      throw new Error(result.error || '更新失败');
    }
    
  } catch (error) {
    console.error('❌ 更新知识点失败:', error);
    // 重新加载数据确保状态一致
    await loadKnowledgeItems();
    throw error;
  }
}, [safeFetch, state.knowledgeItems, loadKnowledgeItems]);

  // 设置编辑知识点
  const setEditingKnowledge = useCallback((knowledge) => {
    dispatch({ type: 'SET_EDITING_KNOWLEDGE', payload: knowledge });
  }, []);

  // 清除编辑状态
  const clearEditingKnowledge = useCallback(() => {
    dispatch({ type: 'CLEAR_EDITING_KNOWLEDGE' });
  }, []);

  // 从知识点生成项目
  const generateProjectFromKnowledge = useCallback(async (knowledgeId) => {
    console.log('🚀 准备从知识点生成项目:', knowledgeId);
    
    try {
      const knowledge = state.knowledgeItems.find(item => item.id === knowledgeId);
      if (!knowledge) {
        throw new Error('知识点不存在');
      }
      
      dispatch({ 
        type: 'PROJECT_GENERATION_START', 
        payload: knowledge 
      });
      
      const response = await safeFetch('/api/projects/generate-from-knowledge', {
        method: 'POST',
        body: JSON.stringify({ 
          knowledgeId,
          title: knowledge.title,
          content: knowledge.content,
          category: knowledge.category,
          tags: knowledge.tags
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 项目生成成功:', result.project);
        dispatch({ type: 'PROJECT_GENERATION_SUCCESS' });
        return result;
      } else {
        throw new Error(result.error || result.message || '项目生成失败');
      }
      
    } catch (error) {
      console.error('❌ 生成项目失败:', error);
      dispatch({ 
        type: 'PROJECT_GENERATION_ERROR', 
        payload: error.message 
      });
      throw error;
    }
  }, [safeFetch, state.knowledgeItems]);

  const resetProjectGeneration = useCallback(() => {
    dispatch({ type: 'PROJECT_GENERATION_RESET' });
  }, []);

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
      monthlyNew: monthlyNew.length,
      byCategory: state.categories.reduce((acc, category) => {
        acc[category] = state.knowledgeItems.filter(item => item.category === category).length;
        return acc;
      }, {})
    };
  }, [state.knowledgeItems, state.categories]);

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

  // 获取推荐的项目生成知识点
  const getRecommendedForProjectGeneration = useCallback(() => {
    return state.knowledgeItems.filter(item => {
      const hasGoodContent = item.content && item.content.length > 200;
      const isTechnical = ['技术', '编程', '开发', '代码'].includes(item.category);
      const hasCodeKeywords = /(代码|实现|函数|方法|组件|API|接口)/.test(item.content);
      
      return hasGoodContent && (isTechnical || hasCodeKeywords);
    });
  }, [state.knowledgeItems]);

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
    projectGeneration: state.projectGeneration,
    editingKnowledge: state.editingKnowledge,
    
    // 操作
    loadKnowledgeItems,
    addKnowledge,
    deleteKnowledge,
    updateKnowledge,
    addCategory,
    addTag,
    setSearchQuery,
    setFilters,
    
    // 编辑操作
    setEditingKnowledge,
    clearEditingKnowledge,
    
    // 项目生成操作
    generateProjectFromKnowledge,
    resetProjectGeneration,
    
    // 计算属性
    getFilteredKnowledge,
    getStatistics,
    getRecommendedForProjectGeneration
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