// src/pages/test-session.js - 修复版本
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'

// 🔧 动态导入客户端操作
const ClientActions = dynamic(() => Promise.resolve(() => {
  const testKnowledgeAPI = async () => {
    try {
      console.log('🧪 测试知识库API...')
      const response = await fetch('/api/knowledge')
      const data = await response.json()
      console.log('知识库API响应:', { status: response.status, data })
    } catch (error) {
      console.error('知识库API错误:', error)
    }
  }

  const testSessionAPI = async () => {
    try {
      console.log('🧪 测试会话API...')
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      console.log('会话API响应:', { status: response.status, data })
    } catch (error) {
      console.error('会话API错误:', error)
    }
  }

  return (
    <div>
      <h2>测试操作</h2>
      <button onClick={testSessionAPI} style={{ margin: '10px', padding: '10px' }}>
        测试会话API
      </button>
      <button onClick={testKnowledgeAPI} style={{ margin: '10px', padding: '10px' }}>
        测试知识库API
      </button>
      
      <h2>Cookie 信息</h2>
      <pre>document.cookie: {document.cookie}</pre>
    </div>
  )
}), { ssr: false })

export default function TestSession() {
  const { data: session, status } = useSession()
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>会话测试页面</h1>
      
      <h2>当前会话状态</h2>
      <pre>状态: {status}</pre>
      <pre>会话数据: {JSON.stringify(session, null, 2)}</pre>
      
      {/* 🔧 使用动态导入的客户端组件 */}
      <ClientActions />
    </div>
  )
}

// 🔧 禁用服务器端渲染
export async function getServerSideProps() {
  return {
    props: {},
  }
}