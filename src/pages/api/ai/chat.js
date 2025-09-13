import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { Configuration, OpenAIApi } from 'openai'
import { authOptions } from '@lib/auth'

const prisma = new PrismaClient()
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, conversationId } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
      max_tokens: 500
    })

    const aiResponse = completion.data.choices[0].message.content

    // 保存对话到数据库
    if (conversationId) {
      // 更新现有对话
      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          messages: {
            push: [
              { role: 'user', content: message },
              { role: 'assistant', content: aiResponse }
            ]
          }
        }
      })
    } else {
      // 创建新对话
      const conversation = await prisma.conversation.create({
        data: {
          userId: parseInt(session.user.id),
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: aiResponse }
          ]
        }
      })
    }

    res.status(200).json({ response: aiResponse })
  } catch (error) {
    console.error('AI API error:', error)
    res.status(500).json({ error: 'Failed to get AI response' })
  }
}
