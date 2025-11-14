import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Head>
        <title>AI项目平台</title>
        <meta name="description" content="智能AI项目管理平台" />
      </Head>
      
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">跳转中...</p>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}
