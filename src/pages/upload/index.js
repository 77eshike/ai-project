// src/pages/upload/index.js - 修复版本
import { useState } from 'react'
import { getServerSession } from 'next-auth/next'

// 🔧 修复：使用正确的相对路径导入 authOptions
let authOptions;

try {
  // 尝试从 lib 目录导入
  authOptions = require('../../lib/auth').authOptions;
} catch (error) {
  try {
    // 尝试从 api/auth 导入
    authOptions = require('../api/auth/[...nextauth]').authOptions;
  } catch (error2) {
    try {
      // 尝试从 src/lib 导入
      authOptions = require('../../../src/lib/auth').authOptions;
    } catch (error3) {
      console.error('❌ 无法导入 authOptions:', error3);
      // 创建临时配置
      authOptions = {
        secret: process.env.NEXTAUTH_SECRET,
        providers: [],
        session: { strategy: 'jwt' }
      };
    }
  }
}

export default function Upload({ user }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (response.ok) {
        setMessage('文件上传成功!')
        setFile(null)
        // 清空文件输入
        document.querySelector('input[type="file"]').value = '';
      } else {
        throw new Error(data.error || '上传失败')
      }
    } catch (error) {
      setMessage('上传失败: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>文件上传</h1>
      <p>欢迎, {user?.name || user?.email}!</p>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ 
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            width: '100%'
          }}
        />
      </div>
      
      <div>
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 1.5rem',
            backgroundColor: (!file || uploading) ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {uploading ? '上传中...' : '上传文件'}
        </button>
      </div>
      
      {message && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem',
          color: message.includes('失败') ? '#d32f2f' : '#2e7d32',
          backgroundColor: message.includes('失败') ? '#ffebee' : '#e8f5e8',
          border: `1px solid ${message.includes('失败') ? '#f44336' : '#4caf50'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ marginTop: '2rem', fontSize: '14px', color: '#666' }}>
        <p>支持的文件类型: 图片, 文档, PDF等</p>
        <p>最大文件大小: 10MB</p>
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  try {
    const session = await getServerSession(context.req, context.res, authOptions)

    console.log('🔍 上传页面会话检查:', {
      hasSession: !!session,
      userId: session?.user?.id
    });

    if (!session) {
      console.log('❌ 上传页面未认证，重定向到登录页');
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false
        }
      }
    }

    return {
      props: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        }
      }
    }
  } catch (error) {
    console.error('❌ 上传页面服务器端错误:', error);
    
    return {
      redirect: {
        destination: '/auth/signin?error=AuthError',
        permanent: false
      }
    }
  }
}