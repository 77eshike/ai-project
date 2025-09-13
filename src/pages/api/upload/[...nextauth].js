import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { authOptions } from '@lib/auth'

const prisma = new PrismaClient()
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `uploads/${session.user.id}/${Date.now()}-${file.name}`

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type
    })

    await s3Client.send(command)

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

    // 保存文件信息到数据库
    const fileRecord = await prisma.file.create({
      data: {
        userId: parseInt(session.user.id),
        filename: file.name,
        key: key,
        size: file.size,
        mimeType: file.type,
        url: fileUrl
      }
    })

    res.status(200).json({ 
      message: 'File uploaded successfully',
      file: fileRecord
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Failed to upload file' })
  }
}

export const config = {
  api: {
    bodyParser: false
  }
}
