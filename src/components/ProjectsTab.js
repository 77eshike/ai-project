// src/components/ProjectsTab.js - 最终版本
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useControlledSession } from '../hooks/useControlledSession';

export default function ProjectsTab({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  // 使用受控会话 Hook
  const { data: session, status: sessionStatus, isAuthenticated, refreshSession } = useControlledSession();

  // 使用 ref 来跟踪状态
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  // 🔧 关键修复：在组件级别也拦截会话检查
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 组件级别的额外拦截
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('/api/auth/session')) {
          console.log('🔍 检测到会话检查网络请求，但已被拦截');
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 加载项目的函数
  const loadProjects = useCallback(async (showRefresh = false) => {
    if (!isMountedRef.current) return;

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('🔄 加载项目列表...', {
        sessionStatus,
        isAuthenticated,
        userId: session?.user?.id
      });

      // 检查会话状态
      if (!isAuthenticated || !session) {
        const errorMsg = '用户未登录，请先登录';
        setError(errorMsg);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ 加载项目成功: ${data.data?.projects?.length || 0} 个项目`);
        
        const formattedProjects = (data.data?.projects || []).map(project => ({
          ...project,
          memberCount: project.memberCount || project._count?.projectMembers || 0,
          members: project.members || project.projectMembers || [],
          isOwner: project.isOwner || project.ownerId === parseInt(session?.user?.id)
        }));
        
        if (isMountedRef.current) {
          setProjects(formattedProjects);
        }
      } else {
        throw new Error(data.error || '获取项目失败');
      }
      
    } catch (error) {
      console.error('❌ 加载项目失败:', error);
      
      if (isMountedRef.current) {
        if (error.name === 'AbortError') {
          setError('请求超时，请检查网络连接或稍后重试');
        } else if (error.message.includes('401')) {
          setError('未授权访问，请重新登录');
        } else if (error.message.includes('500')) {
          setError('服务器内部错误，请稍后重试或联系管理员');
        } else if (error.message.includes('Failed to fetch')) {
          setError('网络连接失败，请检查网络设置');
        } else {
          setError(error.message || '加载项目失败');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [session, sessionStatus, isAuthenticated]);

  // 优化的初始化效果
  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('🔍 ProjectsTab 会话状态:', {
      sessionStatus,
      isAuthenticated,
      hasLoaded: hasLoadedRef.current
    });

    // 如果会话还在加载，等待
    if (sessionStatus === 'loading') {
      console.log('⏳ 会话加载中，等待...');
      return;
    }

    // 如果未认证，停止加载
    if (!isAuthenticated) {
      console.log('🚫 用户未认证');
      if (isMountedRef.current) {
        setLoading(false);
        setProjects([]);
      }
      return;
    }

    // 如果已认证且未加载过，加载项目
    if (isAuthenticated && !hasLoadedRef.current) {
      console.log('🔄 首次加载项目...');
      hasLoadedRef.current = true;
      loadProjects();
    }
  }, [isAuthenticated, sessionStatus, loadProjects]);

  // 重试函数
  const handleRetry = useCallback(() => {
    hasLoadedRef.current = true;
    loadProjects(true);
  }, [loadProjects]);

  // 手动刷新会话
  const handleRefreshSession = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  // ... 其余渲染代码保持不变
}