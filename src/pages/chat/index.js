import { useState } from 'react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@lib/auth'

export default function Chat({ user }) {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    const userMessage = { role: 'user', content: message }
    setConversation(prev => [...prev, userMessage])
    setMessage('')

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      })

      const data = await response.json()
      if (response.ok) {
        setConversation(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>AI Chat</h1>
      <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'auto', padding: '1rem' }}>
        {conversation.map((msg, index) => (
          <div key={index} style={{ 
            marginBottom: '1rem', 
            textAlign: msg.role === 'user' ? 'right' : 'left' 
          }}>
            <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && <div>Thinking...</div>}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          style={{ width: '70%', padding: '0.5rem' }}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', marginLeft: '0.5rem' }}
        >
          Send
        </button>
      </div>
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
