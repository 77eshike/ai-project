// src/contexts/KnowledgeContext.js - 终极优化版本
import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// 🔧 配置常量
const CONFIG = {
  MAX_LOAD_ATTEMPTS: 3,
  DEBOUNCE_DELAY: 300,
  CACHE_DURATION: 5 * 60 * 1000, // 5分钟缓存
  MAX_CONTENT_LENGTH: 10000,
  REQUEST_TIMEOUT: 10000, // 10秒超时
  SAMPLE_DATA: [
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
  ]
};

// 🔧 增强的工具函数
const utils = {
  // 生成唯一ID
  generateId: () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // 验证知识数据
  validateKnowledge: (data) => {
    if (!data.content || data.content.trim().length === 0) {
      throw new Error('知识点内容不能为空');
    }
    if (data.content.length > CONFIG.MAX_CONTENT_LENGTH) {
      throw new Error(`内容长度不能超过 ${CONFIG.MAX_CONTENT_LENGTH} 字符`);
    }
    return true;
  },
  
  // 标准化知识项
  normalizeKnowledgeItem: (item) => ({
    id: item.id || utils.generateId(),
    title: item.title?.trim() || '未命名文档',
    content: item.content?.trim() || '',
    category: item.category?.trim() || '技术',
    tags: typeof item.tags === 'string' ? item.tags : (item.tags || []).join(','),
    source: item.source || '用户添加',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    userId: item.userId || 1,
    ...(item._temp && { _temp: true })
  }),
  
  // 提取分类和标签
  extractMetadata: (items) => {
    const categories = [...new Set(items
      .map(item => item.category)
      .filter(Boolean)
      .map(cat => cat.trim())
    )].sort();
    
    const allTags = items.flatMap(item => {
      if (item.tags && typeof item.tags === 'string') {
        return item.tags.split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
      return [];
    });
    
    const tags = [...new Set(allTags)].sort();
    
    return { categories, tags };
  },

  // 防抖函数
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 安全获取用户ID
  getSafeUserId: (session) => {
    if (!session?.user) return 1;
    
    // 多种方式尝试解析用户ID
    if (session.user.id) {
      try {
        const id = parseInt(session.user.id);
        if (!isNaN(id) && id > 0) return id;
      } catch (e) {
        console.warn('用户ID解析失败:', e);
      }
    }
    
    // 使用邮箱哈希作为备用
    if (session.user.email) {
      let hash = 0;
      for (let i = 0; i < session.user.email.length; i++) {
        const char = session.user.email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash) + 1000;
    }
    
    return 1; // 默认用户ID
  }
};

const KnowledgeContext = createContext();

// 初始状态
const initialState = {
  knowledgeItems: [],
  categories: ['技术', '产品', '设计', '运营', '市场', '文档'],
  tags: ['React', 'JavaScript', 'CSS', 'Node.js', 'Python', 'AI对话'],
  isLoading: false,
  searchQuery: '',
  filters: {
    category: '',
    tags: []
  },
  lastUpdated: null,
  error: null,
  projectGeneration: {
    isGenerating: false,
    currentKnowledge: null,
    error: null
  },
  editingKnowledge: null,
  isInitialized: false,
};

// reducer 处理函数
const knowledgeReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'LOAD_KNOWLEDGE_SUCCESS':
      return { 
        ...state, 
        knowledgeItems: action.payload.items,
        categories: action.payload.categories || state.categories,
        tags: action.payload.tags || state.tags,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        isInitialized: true
      };
    
    case 'LOAD_KNOWLEDGE_ERROR':
      return { 
        ...state, 
        error: action.payload,
        isLoading: false 
      };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'ADD_KNOWLEDGE_SUCCESS':
      const newItem = action.payload;
      return {
        ...state,
        knowledgeItems: [newItem, ...state.knowledgeItems],
        // 更新分类和标签
        categories: [...new Set([...state.categories, newItem.category])].sort(),
        tags: [...new Set([...state.tags, ...newItem.tags.split(',')])].sort()
      };
    
    case 'DELETE_KNOWLEDGE_SUCCESS':
      const deletedId = action.payload;
      const remainingItems = state.knowledgeItems.filter(item => item.id !== deletedId);
      const { categories, tags } = utils.extractMetadata(remainingItems);
      return {
        ...state,
        knowledgeItems: remainingItems,
        categories,
        tags
      };
    
    case 'UPDATE_KNOWLEDGE_SUCCESS':
      const { id, updates } = action.payload;
      const updatedItems = state.knowledgeItems.map(item =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      );
      const updatedMetadata = utils.extractMetadata(updatedItems);
      return {
        ...state,
        knowledgeItems: updatedItems,
        ...updatedMetadata
      };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case 'SET_EDITING_KNOWLEDGE':
      return { ...state, editingKnowledge: action.payload };
    
    case 'SET_PROJECT_GENERATION':
      return {
        ...state,
        projectGeneration: { ...state.projectGeneration, ...action.payload }
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_STATE':
      return {
        ...initialState,
        isInitialized: false
      };
    
    default:
      return state;
  }
};

// 🔧 增强的 API 服务层
const knowledgeAPI = {
  async fetchKnowledge(signal = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    
    try {
      const response = await fetch('/api/knowledge', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  async saveKnowledge(knowledgeData, signal = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    
    try {
      const response = await fetch('/api/knowledge/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowledgeData),
        signal: signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`保存失败: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  async deleteKnowledge(id, signal = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE',
        signal: signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`删除失败: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  async updateKnowledge(id, updates, signal = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`更新失败: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  async generateProjectFromKnowledge(knowledgeId, customPrompt = '', signal = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
      const response = await fetch('/api/projects/generate-from-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeId, customPrompt }),
        signal: signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`生成项目失败: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
};

export const KnowledgeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(knowledgeReducer, initialState);
  const { data: session, status } = useSession();
  
  // 🔧 使用 ref 跟踪状态
  const initializedRef = useRef(false);
  const loadingRef = useRef(false);
  const lastAuthStatusRef = useRef(null);
  const loadAttemptRef = useRef(0);
  const cacheRef = useRef({
    data: null,
    timestamp: 0,
    authStatus: null
  });
  const abortControllerRef = useRef(null);

  // 认证状态
  const isAuthenticated = status === 'authenticated' && !!session;
  const authReady = status !== 'loading';

  // 🔧 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // 🔧 重置状态
  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    initializedRef.current = false;
    loadingRef.current = false;
    loadAttemptRef.current = 0;
    cacheRef.current = { data: null, timestamp: 0, authStatus: null };
  }, []);

  // 🔧 核心加载函数
  const loadKnowledgeItems = useCallback(async (forceRefresh = false) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    // 防护检查
    if (loadingRef.current && !forceRefresh) {
      console.log('⏳ 跳过：正在加载中');
      return;
    }

    if (loadAttemptRef.current >= CONFIG.MAX_LOAD_ATTEMPTS && !forceRefresh) {
      console.log('🚫 跳过：达到加载次数限制');
      return;
    }

    // 检查缓存
    const now = Date.now();
    const cacheValid = cacheRef.current.data && 
                      (now - cacheRef.current.timestamp) < CONFIG.CACHE_DURATION &&
                      cacheRef.current.authStatus === isAuthenticated;

    if (!forceRefresh && cacheValid) {
      console.log('⚡ 使用缓存数据');
      const { categories, tags } = utils.extractMetadata(cacheRef.current.data);
      dispatch({ 
        type: 'LOAD_KNOWLEDGE_SUCCESS', 
        payload: { 
          items: cacheRef.current.data,
          categories,
          tags
        }
      });
      return;
    }

    loadAttemptRef.current += 1;
    loadingRef.current = true;
    
    console.log('🔄 开始加载知识库数据...', { 
      attempt: loadAttemptRef.current,
      forceRefresh,
      authenticated: isAuthenticated,
      useCache: !forceRefresh && cacheValid
    });

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      clearError();
      
      let result;
      
      if (!isAuthenticated) {
        // 未认证用户使用示例数据
        console.log('🔐 未认证用户，使用示例数据');
        result = {
          success: true,
          data: CONFIG.SAMPLE_DATA,
          source: 'sample_unauthenticated'
        };
      } else {
        // 认证用户调用API
        try {
          result = await knowledgeAPI.fetchKnowledge(abortControllerRef.current.signal);
          console.log('✅ 从API加载知识库数据成功:', {
            count: result.data?.length,
            success: result.success,
            source: 'api'
          });
        } catch (apiError) {
          if (apiError.name === 'AbortError') {
            console.log('请求被取消');
            return;
          }
          console.warn('⚠️ API调用失败，使用示例数据:', apiError.message);
          result = {
            success: true,
            data: CONFIG.SAMPLE_DATA,
            source: 'sample_api_fallback'
          };
        }
      }
      
      if (result.success && Array.isArray(result.data)) {
        const validatedData = result.data.map(utils.normalizeKnowledgeItem);
        const { categories, tags } = utils.extractMetadata(validatedData);
        
        // 更新缓存
        cacheRef.current = {
          data: validatedData,
          timestamp: now,
          authStatus: isAuthenticated
        };
        
        dispatch({ 
          type: 'LOAD_KNOWLEDGE_SUCCESS', 
          payload: { 
            items: validatedData,
            categories,
            tags
          }
        });
        
      } else {
        throw new Error(result.error || '数据格式错误');
      }
      
    } catch (error) {
      console.error('❌ 加载知识库失败:', error);
      
      if (error.name === 'AbortError') {
        console.log('请求被取消，跳过错误处理');
        return;
      }
      
      // 降级到示例数据
      console.log('🔄 使用示例数据作为降级方案');
      const validatedData = CONFIG.SAMPLE_DATA.map(utils.normalizeKnowledgeItem);
      const { categories, tags } = utils.extractMetadata(validatedData);
      
      dispatch({ 
        type: 'LOAD_KNOWLEDGE_SUCCESS', 
        payload: { 
          items: validatedData,
          categories,
          tags
        }
      });
      
      // 只在第一次失败时显示错误
      if (loadAttemptRef.current === 1) {
        dispatch({ 
          type: 'LOAD_KNOWLEDGE_ERROR', 
          payload: '加载知识库失败，已使用示例数据' 
        });
      }
      
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      loadingRef.current = false;
      abortControllerRef.current = null;
      
      // 标记为已初始化
      if (!initializedRef.current) {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        initializedRef.current = true;
        console.log('🎉 KnowledgeProvider 初始化完成');
      }
    }
  }, [isAuthenticated, clearError]);

  // 🔧 单一的核心初始化逻辑
  useEffect(() => {
    if (!authReady) {
      console.log('⏳ 等待认证检查完成...');
      return;
    }

    if (initializedRef.current && lastAuthStatusRef.current === status) {
      console.log('✅ 知识库已初始化，跳过重复初始化');
      return;
    }
    
    console.log('🔐 认证状态变化:', {
      from: lastAuthStatusRef.current,
      to: status,
      isAuthenticated,
      initialized: initializedRef.current
    });
    
    lastAuthStatusRef.current = status;

    // 如果认证状态变化，重置状态
    if (initializedRef.current && lastAuthStatusRef.current !== status) {
      console.log('🔄 认证状态变化，重置知识库状态');
      resetState();
    }

    console.log('🎯 触发知识库初始化');
    loadKnowledgeItems();
    
  }, [authReady, status, isAuthenticated, loadKnowledgeItems, resetState]);

  // 🔧 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 🔧 添加知识点函数
  const addKnowledge = useCallback(async (knowledgeData) => {
    if (!isAuthenticated) {
      throw new Error('需要登录后才能添加知识点');
    }

    console.log('💾 准备添加知识点:', {
      title: knowledgeData.title?.substring(0, 50),
      contentLength: knowledgeData.content?.length,
      category: knowledgeData.category
    });
    
    try {
      utils.validateKnowledge(knowledgeData);

      // 添加用户ID
      const knowledgeWithUser = {
        ...knowledgeData,
        userId: utils.getSafeUserId(session)
      };

      // 创建临时项目
      const localItem = utils.normalizeKnowledgeItem({
        ...knowledgeWithUser,
        _temp: true
      });
      
      // 乐观更新
      dispatch({ type: 'ADD_KNOWLEDGE_SUCCESS', payload: localItem });
      
      // 尝试保存到服务器
      try {
        const result = await knowledgeAPI.saveKnowledge(knowledgeWithUser);
        console.log('✅ API保存成功，重新加载数据');
        
        // 使缓存失效
        cacheRef.current.timestamp = 0;
        await loadKnowledgeItems(true);
        
        return { success: true, knowledge: result.data || localItem };
      } catch (apiError) {
        console.warn('⚠️ API保存失败，数据仅保存在本地:', apiError.message);
        return { success: true, knowledge: localItem, localOnly: true };
      }
      
    } catch (error) {
      console.error('❌ 添加知识点失败:', error);
      throw error;
    }
  }, [isAuthenticated, session, loadKnowledgeItems]);

  // 🔧 删除知识点函数
  const deleteKnowledge = useCallback(async (id) => {
    if (!isAuthenticated) {
      throw new Error('需要登录后才能删除知识点');
    }

    console.log('🗑️ 准备删除知识点:', { id });
    
    try {
      // 立即从本地状态移除（乐观更新）
      dispatch({ type: 'DELETE_KNOWLEDGE_SUCCESS', payload: id });
      
      // 尝试从服务器删除
      try {
        await knowledgeAPI.deleteKnowledge(id);
        console.log('✅ 删除成功');
        
        // 使缓存失效
        cacheRef.current.timestamp = 0;
      } catch (apiError) {
        console.warn('⚠️ 服务器删除失败，但已从本地移除');
        // 重新加载以同步状态
        await loadKnowledgeItems(true);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ 删除知识点失败:', error);
      await loadKnowledgeItems(true);
      throw error;
    }
  }, [isAuthenticated, loadKnowledgeItems]);

  // 🔧 更新知识点函数
  const updateKnowledge = useCallback(async (id, knowledgeData) => {
    if (!isAuthenticated) {
      throw new Error('需要登录后才能更新知识点');
    }

    console.log('✏️ 准备更新知识点:', { id });
    
    try {
      utils.validateKnowledge(knowledgeData);

      // 立即更新本地状态（乐观更新）
      dispatch({ type: 'UPDATE_KNOWLEDGE_SUCCESS', payload: { id, updates: knowledgeData } });
      
      // 尝试更新到服务器
      try {
        await knowledgeAPI.updateKnowledge(id, knowledgeData);
        console.log('✅ 更新成功');
        
        // 使缓存失效
        cacheRef.current.timestamp = 0;
      } catch (apiError) {
        console.warn('⚠️ 服务器更新失败，但已更新本地状态');
        await loadKnowledgeItems(true);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ 更新知识点失败:', error);
      await loadKnowledgeItems(true);
      throw error;
    }
  }, [isAuthenticated, loadKnowledgeItems]);

  // 🔧 生成项目函数
  const generateProjectFromKnowledge = useCallback(async (knowledgeId, customPrompt = '') => {
    if (!isAuthenticated) {
      throw new Error('需要登录后才能生成项目');
    }

    console.log('🚀 准备从知识点生成项目:', { knowledgeId });
    
    try {
      dispatch({ 
        type: 'SET_PROJECT_GENERATION', 
        payload: { 
          isGenerating: true, 
          currentKnowledge: knowledgeId,
          error: null 
        } 
      });

      const result = await knowledgeAPI.generateProjectFromKnowledge(knowledgeId, customPrompt);
      
      if (result.success) {
        console.log('✅ 项目生成成功:', result.data);
        dispatch({ 
          type: 'SET_PROJECT_GENERATION', 
          payload: { 
            isGenerating: false, 
            currentKnowledge: null,
            error: null 
          } 
        });
        return result;
      } else {
        throw new Error(result.error || '生成项目失败');
      }
      
    } catch (error) {
      console.error('❌ 生成项目失败:', error);
      dispatch({ 
        type: 'SET_PROJECT_GENERATION', 
        payload: { 
          isGenerating: false, 
          currentKnowledge: null,
          error: error.message 
        } 
      });
      throw error;
    }
  }, [isAuthenticated]);

  // 🔧 搜索和过滤函数
  const setSearchQuery = useCallback(utils.debounce((query) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, CONFIG.DEBOUNCE_DELAY), []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setEditingKnowledge = useCallback((knowledge) => {
    dispatch({ type: 'SET_EDITING_KNOWLEDGE', payload: knowledge });
  }, []);

  // 🔧 过滤和搜索的派生状态 - 使用 useMemo 优化性能
  const filteredKnowledgeItems = useMemo(() => {
    let filtered = state.knowledgeItems;

    // 应用搜索
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.tags.toLowerCase().includes(query)
      );
    }

    // 应用分类过滤
    if (state.filters.category) {
      filtered = filtered.filter(item => item.category === state.filters.category);
    }

    // 应用标签过滤
    if (state.filters.tags && state.filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        state.filters.tags.some(tag => item.tags.includes(tag))
      );
    }

    return filtered;
  }, [state.knowledgeItems, state.searchQuery, state.filters]);

  // 🔧 统计信息
  const statistics = useMemo(() => {
    const total = state.knowledgeItems.length;
    const technical = state.knowledgeItems.filter(item => 
      item.category === '技术' || item.tags.includes('技术')
    ).length;
    const product = state.knowledgeItems.filter(item => 
      item.category === '产品' || item.tags.includes('产品')
    ).length;
    
    return { total, technical, product };
  }, [state.knowledgeItems]);

  // 🔧 推荐生成项目的知识点
  const getRecommendedForProjectGeneration = useCallback(() => {
    return state.knowledgeItems
      .filter(item => {
        const content = item.content || '';
        return content.length > 100 && // 内容较长
               (item.category === '技术' || item.tags.includes('技术')) && // 技术相关
               !item.tags.includes('个人') && // 排除个人笔记
               !item.title.includes('测试'); // 排除测试内容
      })
      .slice(0, 10); // 限制数量
  }, [state.knowledgeItems]);

  const value = {
    // 状态
    ...state,
    
    // 派生状态
    filteredKnowledgeItems,
    
    // 安全状态
    isInitialized: state.isInitialized,
    isAuthenticated,
    
    // 操作函数
    loadKnowledgeItems,
    addKnowledge,
    deleteKnowledge,
    updateKnowledge,
    generateProjectFromKnowledge,
    setSearchQuery,
    setFilters,
    setEditingKnowledge,
    clearError,
    refresh: () => loadKnowledgeItems(true),
    
    // 工具函数
    getFilteredKnowledge: () => filteredKnowledgeItems,
    getStatistics: () => statistics,
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