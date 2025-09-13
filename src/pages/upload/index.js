import { useState } from 'react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@lib/auth'

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
        setMessage('File uploaded successfully!')
        setFile(null)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      setMessage('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>File Upload</h1>
      <div>
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
      <div>
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
      {message && (
        <div style={{ 
          marginTop: '1rem', 
          color: message.includes('failed') ? 'red' : 'green' 
        }}>
          {message}
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false
      }
    }
  }

  return {
    props: {
      user: session.user
    }
  }
}
