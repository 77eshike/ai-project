// hooks/useStableSession.js
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 稳定的会话 Hook，防止频繁重渲染
 */
export function useStableSession() {
  const { data: session, status, update } = useSession();
  const sessionRef = useRef(session);
  const statusRef = useRef(status);
  const [stableSession, setStableSession] = useState(session);
  const [stableStatus, setStableStatus] = useState(status);
  const lastUpdateRef = useRef(Date.now());

  // 使用 ref 来跟踪会话状态，减少重渲染
  useEffect(() => {
    sessionRef.current = session;
    statusRef.current = status;
  });

  // 只在会话真正变化时更新状态（防抖）
  const updateStableState = useCallback(() => {
    const now = Date.now();
    
    // 至少间隔 1 秒才更新状态
    if (now - lastUpdateRef.current < 1000) {
      return;
    }

    let shouldUpdate = false;
    
    // 检查会话数据是否真正变化
    if (session !== stableSession) {
      if (!session && !stableSession) {
        // 两者都是 null，不需要更新
      } else if (session?.user?.id !== stableSession?.user?.id) {
        shouldUpdate = true;
      } else if (session?.expires !== stableSession?.expires) {
        shouldUpdate = true;
      }
    }
    
    // 检查状态是否真正变化
    if (status !== stableStatus) {
      // 忽略 loading 状态之间的切换
      if (!(status === 'loading' && stableStatus === 'loading')) {
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      setStableSession(session);
      setStableStatus(status);
      lastUpdateRef.current = now;
    }
  }, [session, status, stableSession, stableStatus]);

  useEffect(() => {
    updateStableState();
  }, [updateStableState]);

  // 手动更新函数
  const stableUpdate = useCallback(async (data) => {
    lastUpdateRef.current = Date.now();
    return update(data);
  }, [update]);

  return {
    data: stableSession,
    status: stableStatus,
    update: stableUpdate,
    ref: sessionRef
  };
}