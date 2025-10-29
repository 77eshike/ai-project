// lib/api.js
export async function saveKnowledge(data) {
  const response = await fetch('/api/knowledge/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('保存失败');
  }

  return response.json();
}