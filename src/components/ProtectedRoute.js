// components/ProtectedRoute.js
import { useRouter } from 'next/router';
import { useUser } from '../contexts/UserContext';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return user ? children : null;
}