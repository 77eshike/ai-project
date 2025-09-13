import { getServerSession } from 'next-auth/next'
import { authOptions } from '@lib/auth'

export default function Home({ user }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to AI Project</h1>
      {user && user.id ? ( // 检查用户和用户 ID 是否存在
        <div>
          <p>Hello, {user.name || 'User'}!</p>
          <p>Email: {user.email}</p>
          <div>
            <a href="/chat">Go to Chat</a> | 
            <a href="/upload">Upload Files</a> | 
            <a href="/api/auth/signout">Sign Out</a>
          </div>
        </div>
      ) : (
        <div>
          <p>Please sign in to access AI features</p>
          <div>
            <a href="/auth/signin">Sign In</a> | 
            <a href="/auth/signup">Sign Up</a>
          </div>
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  // 确保所有用户属性都有值，即使为 null
  const user = session?.user ? {
    id: session.user.id || null,
    email: session.user.email || null,
    name: session.user.name || null,
    image: session.user.image || null
  } : null

  return {
    props: {
      user
    }
  }
}
