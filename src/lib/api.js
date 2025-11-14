// lib/api.js - 扩展项目相关 API 函数
export async function saveKnowledge(data) {
  try {
    console.log('💾 开始保存知识库数据...', {
      title: data.title?.substring(0, 30),
      contentLength: data.content?.length
    });

    const response = await fetch('/api/knowledge/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include' // 🔧 重要：包含认证 Cookie
    });

    // 🔧 关键修复：处理 401 认证错误
    if (response.status === 401) {
      console.log('🔐 保存知识库时检测到未授权 (401)，重定向到登录页');
      
      // 延迟重定向以避免阻塞当前操作
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const redirectUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}&from=save_knowledge_401`;
        console.log('🔄 触发重定向:', redirectUrl);
        window.location.href = redirectUrl;
      }, 100);
      
      throw new Error('AUTH_REQUIRED_401');
    }

    if (!response.ok) {
      // 尝试获取错误信息
      let errorMessage = `保存失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      
      console.error('❌ 保存知识库失败:', {
        status: response.status,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ 知识库保存成功:', {
      id: result.data?.id,
      title: result.data?.title
    });
    
    return result;

  } catch (error) {
    if (error.message === 'AUTH_REQUIRED_401') {
      // 认证错误已处理，不需要再次抛出
      console.log('🔐 保存操作因认证失败中止');
      return null;
    }
    
    console.error('❌ 保存知识库异常:', error);
    throw error;
  }
}

// 🔧 项目相关 API 函数 - 保持一致的错误处理模式
export async function fetchProjects(params = {}) {
  try {
    console.log('📡 获取项目列表...', {
      params: Object.keys(params),
      page: params.page || 1,
      limit: params.limit || 20
    });

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const response = await fetch(`/api/projects?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    // 🔧 统一处理 401 认证错误
    if (response.status === 401) {
      console.log('🔐 获取项目列表时检测到未授权 (401)，重定向到登录页');
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const redirectUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}&from=fetch_projects_401`;
        console.log('🔄 触发重定向:', redirectUrl);
        window.location.href = redirectUrl;
      }, 100);
      
      throw new Error('AUTH_REQUIRED_401');
    }

    if (!response.ok) {
      let errorMessage = `获取项目列表失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      
      console.error('❌ 获取项目列表失败:', {
        status: response.status,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ 获取项目列表成功:', {
      count: result.data?.projects?.length || 0,
      total: result.data?.pagination?.total || 0
    });
    
    return result;

  } catch (error) {
    if (error.message === 'AUTH_REQUIRED_401') {
      console.log('🔐 获取项目列表因认证失败中止');
      return null;
    }
    
    console.error('❌ 获取项目列表异常:', error);
    throw error;
  }
}

export async function fetchProjectDetail(projectId) {
  try {
    console.log('📡 获取项目详情...', { projectId });

    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    // 🔧 统一处理 401 认证错误
    if (response.status === 401) {
      console.log('🔐 获取项目详情时检测到未授权 (401)，重定向到登录页');
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const redirectUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}&from=fetch_project_detail_401`;
        console.log('🔄 触发重定向:', redirectUrl);
        window.location.href = redirectUrl;
      }, 100);
      
      throw new Error('AUTH_REQUIRED_401');
    }

    if (!response.ok) {
      let errorMessage = `获取项目详情失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      
      console.error('❌ 获取项目详情失败:', {
        status: response.status,
        projectId,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ 获取项目详情成功:', {
      projectId: result.data?.project?.id,
      title: result.data?.project?.title?.substring(0, 30)
    });
    
    return result;

  } catch (error) {
    if (error.message === 'AUTH_REQUIRED_401') {
      console.log('🔐 获取项目详情因认证失败中止');
      return null;
    }
    
    console.error('❌ 获取项目详情异常:', error);
    throw error;
  }
}

export async function createProject(projectData) {
  try {
    console.log('🆕 创建项目...', {
      title: projectData.title?.substring(0, 30),
      type: projectData.type,
      status: projectData.status
    });

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(projectData)
    });

    // 🔧 统一处理 401 认证错误
    if (response.status === 401) {
      console.log('🔐 创建项目时检测到未授权 (401)，重定向到登录页');
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const redirectUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}&from=create_project_401`;
        console.log('🔄 触发重定向:', redirectUrl);
        window.location.href = redirectUrl;
      }, 100);
      
      throw new Error('AUTH_REQUIRED_401');
    }

    if (!response.ok) {
      let errorMessage = `创建项目失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      
      console.error('❌ 创建项目失败:', {
        status: response.status,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ 创建项目成功:', {
      projectId: result.data?.id,
      title: result.data?.title?.substring(0, 30)
    });
    
    return result;

  } catch (error) {
    if (error.message === 'AUTH_REQUIRED_401') {
      console.log('🔐 创建项目因认证失败中止');
      return null;
    }
    
    console.error('❌ 创建项目异常:', error);
    throw error;
  }
}

export async function updateProject(projectId, updateData) {
  try {
    console.log('✏️ 更新项目...', {
      projectId,
      updates: Object.keys(updateData)
    });

    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });

    // 🔧 统一处理 401 认证错误
    if (response.status === 401) {
      console.log('🔐 更新项目时检测到未授权 (401)，重定向到登录页');
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const redirectUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}&from=update_project_401`;
        console.log('🔄 触发重定向:', redirectUrl);
        window.location.href = redirectUrl;
      }, 100);
      
      throw new Error('AUTH_REQUIRED_401');
    }

    if (!response.ok) {
      let errorMessage = `更新项目失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      
      console.error('❌ 更新项目失败:', {
        status: response.status,
        projectId,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ 更新项目成功:', {
      projectId: result.data?.project?.id,
      status: result.data?.project?.status
    });
    
    return result;

  } catch (error) {
    if (error.message === 'AUTH_REQUIRED_401') {
      console.log('🔐 更新项目因认证失败中止');
      return null;
    }
    
    console.error('❌ 更新项目异常:', error);
    throw error;
  }
}

export async function generateProjectFromKnowledge(knowledgeId, customPrompt = '') {
  try {
    console.log('🚀 从知识点生成项目...', {
      knowledgeId,
      hasCustomPrompt: !!customPrompt
    });

    const response = await fetch('/api/projects/generate-from-knowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        knowledgeId,
        customPrompt
      })
    });

    // 🔧 统一处理 401 认证错误
    if (response.status === 401) {
      console.log('🔐 生成项目时检测到未授权 (401)，重定向到登录页');
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const redirectUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}&from=generate_project_401`;
        console.log('🔄 触发重定向:', redirectUrl);
        window.location.href = redirectUrl;
      }, 100);
      
      throw new Error('AUTH_REQUIRED_401');
    }

    if (!response.ok) {
      let errorMessage = `生成项目失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      
      console.error('❌ 生成项目失败:', {
        status: response.status,
        knowledgeId,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ 从知识点生成项目成功:', {
      projectId: result.data?.project?.id,
      title: result.data?.project?.title?.substring(0, 30)
    });
    
    return result;

  } catch (error) {
    if (error.message === 'AUTH_REQUIRED_401') {
      console.log('🔐 生成项目因认证失败中止');
      return null;
    }
    
    console.error('❌ 生成项目异常:', error);
    throw error;
  }
}

export async function addProjectComment(projectId, commentData) {
  try {
    console.log('💬 添加项目评论...', {
      projectId,
      contentLength: commentData.content?.length
    });

    const response = await fetch(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(commentData)
    });

    // 🔧 统一处理 401 认证错误
    if (response.status === 401) {
      console.log('🔐 添加评论时检测到未授权 (401)，重定向到登录页');
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const redirectUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}&from=add_comment_401`;
        console.log('🔄 触发重定向:', redirectUrl);
        window.location.href = redirectUrl;
      }, 100);
      
      throw new Error('AUTH_REQUIRED_401');
    }

    if (!response.ok) {
      let errorMessage = `添加评论失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      
      console.error('❌ 添加评论失败:', {
        status: response.status,
        projectId,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ 添加评论成功:', {
      commentId: result.data?.comment?.id
    });
    
    return result;

  } catch (error) {
    if (error.message === 'AUTH_REQUIRED_401') {
      console.log('🔐 添加评论因认证失败中止');
      return null;
    }
    
    console.error('❌ 添加评论异常:', error);
    throw error;
  }
}

// 🔧 通用 API 配置
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  timeout: 30000,
  retryAttempts: 3
};

// 🔧 辅助函数：构建查询参数
function buildQueryParams(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  return searchParams.toString();
}

// 🔧 辅助函数：统一的错误处理
function handleApiError(error, context) {
  if (error.message === 'AUTH_REQUIRED_401') {
    console.log(`🔐 ${context} 因认证失败中止`);
    return null;
  }
  
  console.error(`❌ ${context} 异常:`, error);
  throw error;
}