// src/pages/chat/index.js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { useUser } from '../../contexts/UserContext';
import Head from 'next/head';
import ErrorBoundary from '../../components/ErrorBoundary';
import ChatTab from '../../components/chat'; // 正确导入聊天主入口

export default function ChatPage({ session }) {
  const router = useRouter();
  const { user, loading, voiceEnabled, toggleVoice } = useUser();
  const [isClient, setIsClient] = useState(false);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !user && !loading && !isRedirectingRef.current) {
      isRedirectingRef.current = true;
      router.push('/auth/signin');
    }
  }, [user, loading, router, isClient]);

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ErrorBoundary>
      <Head>
        <title>深度对话 - AI平台</title>
        <meta name="description" content="与AI助手进行深入讨论" />
      </Head>
      
      <ChatTab 
        user={user}
        voiceEnabled={voiceEnabled}
        toggleVoice={toggleVoice}
      />
    </ErrorBoundary>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { destination: '/auth/signin', permanent: false } };
  }
  return { props: { session } };
}
