// src/pages/api/upload/index.js - 修复版本
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// 🔧 修复：使用正确的相对路径导入 authOptions
let authOptions;

try {
  // 尝试从 lib 目录导入
  authOptions = require('../../../lib/auth').authOptions;
} catch (error) {
  try {
    // 尝试从 src/lib 目录导入
    authOptions = require('../../../../src/lib/auth').authOptions;
  } catch (error2) {
    console.error('❌ 无法导入 authOptions:', error2);
    // 创建临时配置
    authOptions = {
      secret: process.env.NEXTAUTH_SECRET,
      providers: [],
      session: { strategy: 'jwt' }
    };
  }
}

const prisma = new PrismaClient()
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

export default async function handler(req, res) {
  // 先检查方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      console.log('❌ 上传API未授权访问');
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('✅ 上传API认证通过，用户ID:', session.user.id);

    // 🔧 修复：使用 formidable 或其他方式处理文件上传
    // Next.js API 路由不支持直接使用 FormData
    const formidable = require('formidable');
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    // 读取文件内容
    const fs = require('fs');
    const buffer = fs.readFileSync(file.filepath);

    const key = `uploads/${session.user.id}/${Date.now()}-${file.originalFilename}`

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.mimetype,
      ACL: 'private' // 🔧 建议设置为私有
    })

    await s3Client.send(command)

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

    // 保存文件信息到数据库
    const fileRecord = await prisma.file.create({
      data: {
        userId: parseInt(session.user.id),
        filename: file.originalFilename,
        key: key,
        size: file.size,
        mimeType: file.mimetype,
        url: fileUrl
      }
    })

    // 清理临时文件
    fs.unlinkSync(file.filepath);

    res.status(200).json({ 
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        url: fileRecord.url,
        size: fileRecord.size
      }
    })
  } catch (error) {
    console.error('❌ 上传错误:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export const config = {
  api: {
    bodyParser: false // 🔧 正确禁用 bodyParser
  }
}