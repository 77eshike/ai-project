// src/pages/api/projects/[id]/format.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { ProjectWorkflowService } from "../../../../services/ProjectWorkflowService";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: '方法不允许' 
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ 
        success: false,
        error: '请先登录' 
      });
    }

    const { template = 'STANDARD' } = req.body;

    console.log(`📨 收到AI格式化请求:`, { 
      projectId: id, 
      template,
      userId: session.user.id 
    });

    const result = await ProjectWorkflowService.formatProjectWithAI(id, template);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ API格式化错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}