import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function AuthGuard({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // 仍在加载中

    if (!session && status === 'unauthenticated') {
      // 未认证，重定向到登录页
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(router.asPath)}`)
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session) {
    return null // 或者显示加载状态
  }

  return children
}