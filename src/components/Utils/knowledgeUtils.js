// utils/knowledgeUtils.js

// 统一的内容解析函数
export const parseKnowledgeContent = (content) => {
  if (!content) return '';
  
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map(item => item.content).join('\n\n');
    }
    return String(content);
  } catch (e) {
    return String(content);
  }
};

// 统一的内容格式化函数（用于保存）
export const formatKnowledgeContent = (content) => {
  if (!content || content.trim() === '') {
    return JSON.stringify([{ type: 'text', content: '' }]);
  }
  
  // 如果已经是JSON格式，保持原样
  try {
    JSON.parse(content);
    return content;
  } catch (e) {
    // 如果不是JSON，转换为标准格式
    return JSON.stringify([{ type: 'text', content: content.trim() }]);
  }
};

// 统一的标题生成函数
export const generateKnowledgeTitle = (content, fallback = '未命名知识点') => {
  if (!content) return fallback;
  
  const textContent = parseKnowledgeContent(content);
  return textContent.substring(0, 50) + (textContent.length > 50 ? '...' : '');
};

// 统一的数据验证
export const validateKnowledgeData = (data) => {
  const errors = [];
  
  if (!data.content || data.content.trim().length === 0) {
    errors.push('内容不能为空');
  }
  
  if (data.title && data.title.length > 100) {
    errors.push('标题不能超过100个字符');
  }
  
  return errors;
};