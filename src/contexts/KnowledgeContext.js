// src/contexts/KnowledgeContext.js - 完整修复版本（优化新建功能）
import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// 🔧 配置常量
const CONFIG = {
  MAX_LOAD_ATTEMPTS: 3,
  DEBOUNCE_DELAY: 300,
  CACHE_DURATION: 10 * 60 * 1000,
  MAX_CONTENT_LENGTH: 10000,
  REQUEST_TIMEOUT: 15000,
  SAMPLE_DATA: [
    {
      id: 'sample-1',
      title: '欢迎使用知识库',
      content: JSON.stringify([{ type: 'text', content: '这是您的第一个知识点！登录后即可开始管理您的个人知识库。' }]),
      category: '文档',
      tags: '欢迎,使用指南,示例',
      source: '系统示例',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'default-user'
    }
  ]
};

// 🔧 关键修复：增强的工具函数
const utils = {
  generateId: () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  validateKnowledge: (data) => {
    if (!data.content || (typeof data.content === 'string' && data.content.trim().length === 0)) {
      throw new Error('知识点内容不能为空');
    }
    return true;
  },

  safeStringField: (value, defaultValue = '') => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value.trim() || defaultValue;
    return String(value).trim() || defaultValue;
  },
  
  // 🔧 关键修复：改进的用户ID获取函数
  getSafeUserId: (session) => {
    if (!session?.user) {
      console.log('🔐 无用户会话，使用默认用户ID');
      return 'default-user';
    }
    
    console.log('🔍 会话用户信息:', {
      hasId: !!session.user.id,
      id: session.user.id,
      idType: typeof session.user.id,
      email: session.user.email,
      allKeys: Object.keys(session.user)
    });
    
    // 优先使用 session.user.id
    if (session.user.id && typeof session.user.id === 'string') {
      const userId = session.user.id.trim();
      console.log('✅ 使用会话用户ID:', userId);
      return userId;
    }
    
    // 备用方案：使用邮箱
    if (session.user.email) {
      const fallbackId = `email-${session.user.email.replace(/[^a-zA-Z0-9]/g, '-')}`;
      console.log('🔄 使用邮箱备用用户ID:', fallbackId);
      return fallbackId;
    }
    
    console.log('❌ 无法获取用户ID，使用默认值');
    return 'default-user';
  },

  isTempId: (id) => {
    return id && typeof id === 'string' && id.startsWith('temp-');
  },

  normalizeKnowledgeItem: (item) => {
    let content = item.content || '';
    
    if (typeof content !== 'string') {
      try {
        if (Array.isArray(content)) {
          content = JSON.stringify(content);
        } else if (typeof content === 'object') {
          if (content.type && content.content) {
            content = JSON.stringify([content]);
          } else {
            content = JSON.stringify(content);
          }
        } else {
          content = String(content);
        }
      } catch (e) {
        console.warn('⚠️ 内容转换失败:', e.message);
        content = JSON.stringify([{ type: 'text', content: '内容格式错误' }]);
      }
    }
    
    try {
      JSON.parse(content);
    } catch (e) {
      content = JSON.stringify([{ type: 'text', content: content }]);
    }
    
    const now = new Date().toISOString();
    let createdAt, updatedAt;
    try {
      createdAt = item.createdAt ? new Date(item.createdAt).toISOString() : now;
      updatedAt = item.updatedAt ? new Date(item.updatedAt).toISOString() : now;
    } catch (e) {
      createdAt = now;
      updatedAt = now;
    }
    
    return {
      id: item.id || utils.generateId(),
      title: utils.safeStringField(item.title, '未命名文档'),
      content: content,
      category: utils.safeStringField(item.category, '技术'),
      tags: utils.safeStringField(item.tags, '未分类'),
      source: utils.safeStringField(item.source, '用户添加'),
      createdAt: createdAt,
      updatedAt: updatedAt,
      userId: item.userId || 'default-user',
      ...(item._temp && { _temp: true }),
      ...(item._saveFailed && { _saveFailed: true }),
      ...(item._error && { _error: item._error })
    };
  },
  
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

  // 自动生成标题
  generateTitle: (content) => {
    if (!content) return '未命名知识点';
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed[0]?.content) {
        const text = parsed[0].content;
        return text.substring(0, 50) + (text.length > 50 ? '...' : '');
      }
    } catch (e) {
      // 不是JSON格式
    }
    
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }
};

const KnowledgeContext = createContext();

// 初始状态
const initialState = {
  knowledgeItems: [],
  categories: ['技术', '产品', '设计', '运营', '市场', '文档', '学习', '工作'],
  tags: ['React', 'JavaScript', 'CSS', 'Node.js', 'Python', 'AI对话', '会议记录', '学习笔记'],
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
    
    case 'ADD_KNOWLEDGE_SUCCESS':
      const newItem = action.payload;
      const updatedCategories = [...new Set([...state.categories, newItem.category])].sort();
      const newTags = newItem.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const updatedTags = [...new Set([...state.tags, ...newTags])].sort();
      
      return {
        ...state,
        knowledgeItems: [newItem, ...state.knowledgeItems],
        categories: updatedCategories,
        tags: updatedTags
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
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_STATE':
      return {
        ...initialState,
        isInitialized: false
      };

    case 'ADD_CATEGORY':
      const newCategory = action.payload;
      if (!state.categories.includes(newCategory)) {
        return {
          ...state,
          categories: [...state.categories, newCategory].sort()
        };
      }
      return state;

    case 'ADD_TAG':
      const newTag = action.payload;
      if (!state.tags.includes(newTag)) {
        return {
          ...state,
          tags: [...state.tags, newTag].sort()
        };
      }
      return state;
    
    default:
      return state;
  }
};

// 🔧 简化的 API 服务层
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
      const dataToSend = { ...knowledgeData };
      if (utils.isTempId(dataToSend.id)) {
        delete dataToSend.id;
      }
      delete dataToSend._temp;
      delete dataToSend.createdAt;
      delete dataToSend.updatedAt;
      
      console.log('📤 发送到服务器的数据:', dataToSend);
      
      const response = await fetch('/api/knowledge/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
        signal: signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`保存失败: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  // 🔧 关键修复：添加 updateKnowledge API 方法
  async updateKnowledge(id, updates, signal = null) {
    if (utils.isTempId(id)) {
      // 临时数据的更新直接在本地处理
      return { 
        success: true, 
        data: { ...updates, id },
        message: '临时数据更新成功' 
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    
    try {
      console.log('✏️ 发送更新请求:', { id, updates });
      
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`更新失败: HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ 更新API响应:', result);
      return result;
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ 更新API请求失败:', error);
      throw error;
    }
  },
  
  async deleteKnowledge(id, signal = null) {
    if (utils.isTempId(id)) {
      return { success: true, message: '临时数据已删除' };
    }
    
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
  }
};

export const KnowledgeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(knowledgeReducer, initialState);
  const { data: session, status } = useSession();
  
  const initializedRef = useRef(false);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const isAuthenticated = status === 'authenticated' && !!session;
  const authReady = status !== 'loading';
  
  // 🔧 关键修复：使用改进的用户ID获取
  const currentUserId = utils.getSafeUserId(session);

  // 🔧 核心加载函数 - 简化版本
  const loadKnowledgeItems = useCallback(async (forceRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (loadingRef.current && !forceRefresh) {
      return;
    }

    abortControllerRef.current = new AbortController();
    loadingRef.current = true;
    
    console.log('🔄 开始加载知识库数据...', { 
      authenticated: isAuthenticated,
      userId: currentUserId,
      sessionUser: session?.user
    });

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      let result;
      
      if (!isAuthenticated) {
        console.log('🔐 未认证用户，使用示例数据');
        result = {
          success: true,
          data: CONFIG.SAMPLE_DATA,
          source: 'sample_unauthenticated'
        };
      } else {
        try {
          result = await knowledgeAPI.fetchKnowledge(abortControllerRef.current.signal);
          console.log('✅ 从API加载知识库数据成功:', {
            count: result.data?.length,
            success: result.success
          });
        } catch (apiError) {
          if (apiError.name === 'AbortError') return;
          
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
      
      if (error.name === 'AbortError') return;
      
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
      
      dispatch({ 
        type: 'LOAD_KNOWLEDGE_ERROR', 
        payload: '加载知识库失败，已使用示例数据' 
      });
      
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      loadingRef.current = false;
      abortControllerRef.current = null;
      
      if (!initializedRef.current) {
        initializedRef.current = true;
        console.log('🎉 KnowledgeProvider 初始化完成');
      }
    }
  }, [isAuthenticated, currentUserId, session]);

  // 🔧 关键修复：初始化逻辑
  useEffect(() => {
    const initializeKnowledge = async () => {
      if (!authReady) {
        console.log('⏳ 等待认证准备完成...');
        return;
      }

      console.log('🎯 开始初始化知识库', {
        authReady,
        status,
        isAuthenticated,
        userId: currentUserId
      });

      try {
        await loadKnowledgeItems(true);
        initializedRef.current = true;
        console.log('🎉 知识库初始化完成');
      } catch (error) {
        console.error('❌ 知识库初始化失败:', error);
      }
    };

    initializeKnowledge();
  }, [authReady, status, isAuthenticated, currentUserId, loadKnowledgeItems]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 🔧 优化：增强的添加知识点函数
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

      // 如果没有标题，自动生成
      let finalTitle = knowledgeData.title;
      if (!finalTitle || finalTitle.trim() === '') {
        finalTitle = utils.generateTitle(knowledgeData.content);
      }

      const safeKnowledgeData = {
        ...knowledgeData,
        title: utils.safeStringField(finalTitle, ''),
        content: knowledgeData.content,
        category: utils.safeStringField(knowledgeData.category, '技术'),
        tags: utils.safeStringField(knowledgeData.tags, '未分类'),
        source: utils.safeStringField(knowledgeData.source, 'manual'),
        userId: currentUserId
      };

      const tempId = utils.generateId();
      const localItem = utils.normalizeKnowledgeItem({
        ...safeKnowledgeData,
        id: tempId,
        _temp: true
      });
      
      // 立即显示在列表中
      dispatch({ type: 'ADD_KNOWLEDGE_SUCCESS', payload: localItem });
      
      try {
        const result = await knowledgeAPI.saveKnowledge(safeKnowledgeData);
        console.log('✅ API保存成功');
        
        if (result.success && result.data) {
          // 用服务器返回的数据替换临时数据
          dispatch({ 
            type: 'UPDATE_KNOWLEDGE_SUCCESS', 
            payload: { 
              id: tempId, 
              updates: {
                ...result.data,
                _temp: false
              }
            } 
          });
          
          return { 
            success: true, 
            knowledge: result.data,
            tempId,
            realId: result.data?.id 
          };
        } else {
          throw new Error(result.error || '保存操作未成功');
        }
      } catch (apiError) {
        console.warn('⚠️ API保存失败，数据仅保存在本地:', apiError.message);
        // 标记为保存失败，但仍然保留在本地
        dispatch({ 
          type: 'UPDATE_KNOWLEDGE_SUCCESS', 
          payload: { 
            id: tempId, 
            updates: {
              ...localItem,
              _temp: true,
              _saveFailed: true,
              _error: apiError.message
            }
          } 
        });
        
        return { 
          success: false, 
          knowledge: localItem, 
          localOnly: true,
          tempId,
          error: apiError.message
        };
      }
      
    } catch (error) {
      console.error('❌ 添加知识点失败:', error);
      throw error;
    }
  }, [isAuthenticated, currentUserId]);

  // 🔧 关键修复：添加 updateKnowledge 函数
  const updateKnowledge = useCallback(async (id, updates) => {
    if (!isAuthenticated) {
      throw new Error('需要登录后才能更新知识点');
    }

    console.log('✏️ 准备更新知识点:', { 
      id, 
      title: updates.title?.substring(0, 30),
      category: updates.category 
    });
    
    try {
      // 验证更新数据
      if (updates.content && typeof updates.content === 'string' && updates.content.trim().length === 0) {
        throw new Error('知识点内容不能为空');
      }

      // 构建安全数据
      const safeUpdates = {};
      if (updates.title !== undefined) {
        safeUpdates.title = utils.safeStringField(updates.title, '');
      }
      if (updates.content !== undefined) {
        safeUpdates.content = updates.content;
      }
      if (updates.category !== undefined) {
        safeUpdates.category = utils.safeStringField(updates.category, '技术');
      }
      if (updates.tags !== undefined) {
        safeUpdates.tags = utils.safeStringField(updates.tags, '未分类');
      }
      if (updates.source !== undefined) {
        safeUpdates.source = utils.safeStringField(updates.source, 'manual');
      }

      // 如果是临时ID，直接在本地更新
      if (utils.isTempId(id)) {
        console.log('🔄 更新临时知识点，跳过服务器调用');
        dispatch({ 
          type: 'UPDATE_KNOWLEDGE_SUCCESS', 
          payload: { id, updates: safeUpdates } 
        });
        return { 
          success: true, 
          knowledge: { id, ...safeUpdates },
          localOnly: true 
        };
      }

      // 先进行乐观更新
      dispatch({ 
        type: 'UPDATE_KNOWLEDGE_SUCCESS', 
        payload: { id, updates: safeUpdates } 
      });

      try {
        const result = await knowledgeAPI.updateKnowledge(id, safeUpdates);
        console.log('✅ API更新成功');
        
        if (result.success && result.data) {
          // 使用服务器返回的数据更新本地状态
          dispatch({ 
            type: 'UPDATE_KNOWLEDGE_SUCCESS', 
            payload: { 
              id, 
              updates: {
                ...result.data,
                _temp: false
              }
            } 
          });
          
          return { 
            success: true, 
            knowledge: result.data 
          };
        } else {
          throw new Error(result.error || '更新操作未成功');
        }
        
      } catch (apiError) {
        console.warn('⚠️ API更新失败，回滚到之前的状态:', apiError.message);
        // 重新加载数据以回滚乐观更新
        await loadKnowledgeItems(true);
        throw new Error(`更新失败: ${apiError.message}`);
      }
      
    } catch (error) {
      console.error('❌ 更新知识点失败:', error);
      throw error;
    }
  }, [isAuthenticated, loadKnowledgeItems]);

  // 🔧 简化的删除知识点函数
  const deleteKnowledge = useCallback(async (id) => {
    if (!isAuthenticated) {
      throw new Error('需要登录后才能删除知识点');
    }

    console.log('🗑️ 准备删除知识点:', { id });
    
    dispatch({ type: 'DELETE_KNOWLEDGE_SUCCESS', payload: id });
    
    if (utils.isTempId(id)) {
      console.log('🔄 删除临时知识点，跳过服务器调用');
      return { success: true, localOnly: true };
    }
    
    try {
      await knowledgeAPI.deleteKnowledge(id);
      console.log('✅ 删除成功');
      return { success: true };
      
    } catch (apiError) {
      console.warn('⚠️ 服务器删除失败，但已从本地移除');
      await loadKnowledgeItems(true);
      throw new Error(`删除失败: ${apiError.message}`);
    }
  }, [isAuthenticated, loadKnowledgeItems]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setSearchQuery = useCallback(utils.debounce((query) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, CONFIG.DEBOUNCE_DELAY), []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setEditingKnowledge = useCallback((knowledge) => {
    dispatch({ type: 'SET_EDITING_KNOWLEDGE', payload: knowledge });
  }, []);

  const clearEditingKnowledge = useCallback(() => {
    dispatch({ type: 'SET_EDITING_KNOWLEDGE', payload: null });
  }, []);

  const addCategory = useCallback((category) => {
    dispatch({ type: 'ADD_CATEGORY', payload: category });
  }, []);

  const addTag = useCallback((tag) => {
    dispatch({ type: 'ADD_TAG', payload: tag });
  }, []);

  const filteredKnowledgeItems = useMemo(() => {
    let filtered = state.knowledgeItems;

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.content && item.content.toLowerCase().includes(query)) ||
        (item.tags && item.tags.toLowerCase().includes(query))
      );
    }

    if (state.filters.category) {
      filtered = filtered.filter(item => item.category === state.filters.category);
    }

    if (state.filters.tags && state.filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        state.filters.tags.some(tag => item.tags && item.tags.includes(tag))
      );
    }

    return filtered;
  }, [state.knowledgeItems, state.searchQuery, state.filters]);

  const value = {
    ...state,
    filteredKnowledgeItems,
    isInitialized: state.isInitialized,
    isAuthenticated,
    loadKnowledgeItems,
    addKnowledge,
    updateKnowledge, // 🔧 关键修复：添加 updateKnowledge 函数
    deleteKnowledge,
    setSearchQuery,
    setFilters,
    setEditingKnowledge,
    clearEditingKnowledge,
    clearError,
    addCategory,
    addTag,
    refresh: () => loadKnowledgeItems(true),
    isTempId: utils.isTempId
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