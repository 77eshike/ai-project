// src/hooks/useAuth.js
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const { data: session, status } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() {
    const checkAuth = async () => {
      if (status === 'loading') return;
      
      if (session?.user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [session, status]);

  return {
    session,
    status,
    isAuthenticated,
    user: session?.user
  };
};