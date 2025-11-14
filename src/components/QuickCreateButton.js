// components/QuickCreateButton.js - 快速创建按钮组件
import { useState } from 'react';
import { useKnowledge } from '../contexts/KnowledgeContext';

export default function QuickCreateButton() {
  const { addKnowledge } = useKnowledge();
  const [isCreating, setIsCreating] = useState(false);

  const quickTemplates = [
    {
      name: '会议记录',
      icon: '📅',
      data: {
        title: '会议记录',
        content: `会议主题：
参会人员：
会议时间：
主要内容：
决议事项：`,
        category: '文档',
        tags: '会议,记录'
      }
    },
    {
      name: '代码片段',
      icon: '💻',
      data: {
        title: '代码片段',
        content: `// 功能描述：
// 使用示例：

function example() {
  // 代码实现
}`,
        category: '技术',
        tags: '代码,编程'
      }
    },
    {
      name: '学习笔记',
      icon: '📚',
      data: {
        title: '学习笔记',
        content: `学习主题：
重点内容：
关键理解：
相关链接：`,
        category: '学习',
        tags: '学习,笔记'
      }
    },
    {
      name: '任务记录',
      icon: '✅',
      data: {
        title: '任务记录',
        content: `任务名称：
任务描述：
完成状态：
经验总结：`,
        category: '工作',
        tags: '任务,记录'
      }
    }
  ];

  const handleQuickCreate = async (template) => {
    setIsCreating(true);
    try {
      const result = await addKnowledge(template);
      if (result.success) {
        // 可以在这里添加成功提示
        console.log('✅ 快速创建成功:', result);
      } else {
        console.error('❌ 快速创建失败:', result.error);
      }
    } catch (error) {
      console.error('❌ 快速创建失败:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative group">
      <button
        disabled={isCreating}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:bg-green-400 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {isCreating ? '创建中...' : '快速新建'}
      </button>
      
      {/* 下拉菜单 */}
      <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
        <div className="p-2">
          <div className="text-xs text-gray-500 font-medium mb-2 px-2">选择模板</div>
          {quickTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => handleQuickCreate(template.data)}
              disabled={isCreating}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg mr-2">{template.icon}</span>
              {template.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}