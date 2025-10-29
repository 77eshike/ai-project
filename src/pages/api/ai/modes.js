// pages/api/ai/modes.js
import { AI_MODES } from '../../../lib/ai-modes';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { mode } = req.query;
      
      if (mode && AI_MODES[mode]) {
        res.status(200).json({ 
          mode: AI_MODES[mode],
          available: true 
        });
      } else if (mode) {
        res.status(404).json({ 
          error: '模式不存在',
          availableModes: Object.keys(AI_MODES)
        });
      } else {
        res.status(200).json({ 
          modes: AI_MODES,
          count: Object.keys(AI_MODES).length
        });
      }
    } catch (error) {
      console.error('获取AI模式错误:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `方法 ${req.method} 不允许` });
  }
}