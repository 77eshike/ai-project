import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function UploadPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/simple-auth/session')
      const data = await res.json()
      
      if (data.authenticated) {
        setUser(data.user)
      } else {
        router.push('/auth/signin?callbackUrl=/upload')
      }
    } catch (error) {
      console.error('认证检查失败:', error)
      router.push('/auth/signin?callbackUrl=/upload')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setMessage('')
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setMessage('请选择文件')
      return
    }

    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('文件上传成功！')
        setFile(null)
        e.target.reset()
      } else {
        setMessage(data.error || '上传失败')
      }
    } catch (error) {
      console.error('上传错误:', error)
      setMessage('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>加载中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>未授权，正在跳转...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1>文件上传</h1>
        <div>
          <span>欢迎, {user.name} </span>
          <button 
            onClick={() => router.push('/dashboard')}
            style={{
              marginLeft: '10px',
              padding: '5px 10px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            返回控制面板
          </button>
        </div>
      </div>

      <div style={{
        padding: '30px',
        border: '2px dashed #ddd',
        borderRadius: '8px',
        textAlign: 'center',
        backgroundColor: '#fafafa'
      }}>
        <form onSubmit={handleUpload}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              style={{
                margin: '10px 0'
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={uploading || !file}
            style={{
              padding: '12px 24px',
              backgroundColor: uploading || !file ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: uploading || !file ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {uploading ? '上传中...' : '上传文件'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '20px',
            padding: '10px',
            backgroundColor: message.includes('成功') ? '#e6ffe6' : '#ffe6e6',
            border: `1px solid ${message.includes('成功') ? '#00cc00' : '#ff4444'}`,
            borderRadius: '4px',
            color: message.includes('成功') ? '#006600' : '#cc0000'
          }}>
            {message}
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>上传说明</h3>
        <ul>
          <li>支持各种文件格式上传</li>
          <li>文件大小限制: 10MB</li>
          <li>上传后文件将存储在安全位置</li>
        </ul>
      </div>
    </div>
  )
}
