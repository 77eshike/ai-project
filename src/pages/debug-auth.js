// src/pages/debug-auth.js - 修复版本
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// 🔧 动态导入客户端组件，避免服务器端渲染问题
const ClientDebugInfo = dynamic(() => Promise.resolve(({ session, diagnostic, knowledgeTest }) => {
  return (
    <div>
      <h2>4. 浏览器 Cookie</h2>
      <pre>Cookie: {document.cookie || '无Cookie'}</pre>
      
      <h2>5. 操作</h2>
      <button onClick={() => window.location.reload()} style={{ margin: '5px' }}>
        刷新页面
      </button>
      <button onClick={() => fetch('/api/auth/session').then(r => r.json()).then(console.log)} style={{ margin: '5px' }}>
        测试会话API
      </button>
      <button onClick={() => fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.reload())} style={{ margin: '5px' }}>
        退出登录
      </button>
    </div>
  )
}), { ssr: false })

export default function DebugAuth() {
  const { data: session, status } = useSession()
  const [diagnostic, setDiagnostic] = useState(null)
  const [knowledgeTest, setKnowledgeTest] = useState(null)

  useEffect(() => {
    // 获取诊断信息
    fetch('/api/debug-auth')
      .then(res => res.json())
      .then(setDiagnostic)
      .catch(console.error)

    // 测试知识库API
    fetch('/api/knowledge')
      .then(res => {
        setKnowledgeTest({
          status: res.status,
          statusText: res.statusText,
          ok: res.ok
        })
        return res.json()
      })
      .then(data => {
        setKnowledgeTest(prev => ({ ...prev, data }))
      })
      .catch(error => {
        setKnowledgeTest(prev => ({ ...prev, error: error.message }))
      })
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h1>🔍 认证诊断页面</h1>
      
      <h2>1. NextAuth 会话状态</h2>
      <pre>状态: {status}</pre>
      <pre>会话数据: {JSON.stringify(session, null, 2)}</pre>
      
      <h2>2. 服务器端诊断</h2>
      <pre>{JSON.stringify(diagnostic, null, 2)}</pre>
      
      <h2>3. 知识库API测试</h2>
      <pre>{JSON.stringify(knowledgeTest, null, 2)}</pre>
      
      {/* 🔧 使用动态导入的客户端组件 */}
      <ClientDebugInfo 
        session={session} 
        diagnostic={diagnostic} 
        knowledgeTest={knowledgeTest} 
      />
    </div>
  )
}

// 🔧 禁用服务器端渲染
export async function getServerSideProps() {
  return {
    props: {},
  }
}