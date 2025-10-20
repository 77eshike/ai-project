import { useState, useEffect } from 'react';

// 确保这是默认导出
export default function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <h2>我的项目</h2>
      {/* 项目列表渲染 */}
    </div>
  );
}