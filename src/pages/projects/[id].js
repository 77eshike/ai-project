import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setProject(data.project);
      } else {
        console.error('加载项目详情失败:', data.error);
        router.push('/projects');
      }
    } catch (error) {
      console.error('加载项目详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/projects/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText })
      });
      
      const data = await response.json();
      if (data.success) {
        setCommentText('');
        loadProject(); // 重新加载项目以获取最新评论
      }
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  };

  const updateProjectStatus = async (newStatus) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
      }
    } catch (error) {
      console.error('更新项目状态失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载项目详情中...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">项目不存在</h3>
          <button
            onClick={() => router.push('/projects')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回项目列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 项目头部 */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  {project.title}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  project.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                  project.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'RECRUITING' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {project.status}
                </span>
              </div>
              <p className="text-gray-600 text-lg">{project.description}</p>
            </div>
            
            <div className="flex space-x-3 w-full lg:w-auto">
              {project.status === 'DRAFT' && (
                <button
                  onClick={() => updateProjectStatus('PUBLISHED')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  发布项目
                </button>
              )}
              {project.status === 'PUBLISHED' && (
                <button
                  onClick={() => updateProjectStatus('RECRUITING')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  开始招募
                </button>
              )}
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                分享项目
              </button>
            </div>
          </div>

          {/* 标签栏 */}
          <div className="flex space-x-8 mt-6 border-b overflow-x-auto">
            {[
              { id: 'overview', label: '项目概览', icon: '📊' },
              { id: 'team', label: '团队成员', icon: '👥' },
              { id: 'recruitment', label: '招募信息', icon: '🎯' },
              { id: 'updates', label: '项目动态', icon: '🔄' },
              { id: 'comments', label: '讨论区', icon: '💬' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center pb-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 标签内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <ProjectOverview project={project} />}
        {activeTab === 'team' && <ProjectTeam project={project} />}
        {activeTab === 'recruitment' && <ProjectRecruitment project={project} />}
        {activeTab === 'comments' && (
          <ProjectComments 
            project={project} 
            commentText={commentText}
            setCommentText={setCommentText}
            onAddComment={addComment}
          />
        )}
      </div>
    </div>
  );
}

// 项目概览组件
function ProjectOverview({ project }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 左侧内容 */}
      <div className="lg:col-span-2 space-y-6">
        {/* 项目进度 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">项目进度</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">整体进度</span>
                <span className="text-gray-600">65%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: '65%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 项目内容 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">项目详情</h3>
          <div className="prose max-w-none text-gray-700">
            {project.content ? (
              <div className="whitespace-pre-wrap">{project.content}</div>
            ) : (
              <p className="text-gray-500 italic">暂无项目详情内容</p>
            )}
          </div>
        </div>
      </div>

      {/* 右侧边栏 */}
      <div className="space-y-6">
        {/* 项目信息卡片 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">项目信息</h3>
          <div className="space-y-4">
            <div>
              <span className="text-gray-600 text-sm block">项目负责人</span>
              <div className="font-medium flex items-center mt-1">
                <img 
                  src={project.owner.image || '/default-avatar.png'} 
                  alt={project.owner.name}
                  className="w-6 h-6 rounded-full mr-2"
                />
                {project.owner.name}
              </div>
            </div>
            <div>
              <span className="text-gray-600 text-sm block">创建时间</span>
              <div className="font-medium">
                {new Date(project.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            <div>
              <span className="text-gray-600 text-sm block">最后更新</span>
              <div className="font-medium">
                {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            <div>
              <span className="text-gray-600 text-sm block">项目类型</span>
              <div className="font-medium">
                {project.type === 'DRAFT_PROJECT' ? '待定项目' : '正式项目'}
              </div>
            </div>
            <div>
              <span className="text-gray-600 text-sm block">可见性</span>
              <div className="font-medium">
                {project.visibility === 'PUBLIC' ? '公开' : 
                 project.visibility === 'PRIVATE' ? '私有' : '邀请可见'}
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">快速操作</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <span className="mr-2">👥</span>
              邀请成员
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <span className="mr-2">📝</span>
              发布更新
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <span className="mr-2">🎯</span>
              创建招募
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 团队成员组件
function ProjectTeam({ project }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">团队成员</h3>
      <div className="space-y-4">
        {project.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <img 
                src={member.user.image || '/default-avatar.png'} 
                alt={member.user.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-medium">{member.user.name}</div>
                <div className="text-sm text-gray-600">{member.user.email}</div>
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              member.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
              member.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {member.role === 'OWNER' ? '负责人' : 
               member.role === 'ADMIN' ? '管理员' : '成员'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 招募信息组件
function ProjectRecruitment({ project }) {
  return (
    <div className="space-y-6">
      {project.recruitments && project.recruitments.length > 0 ? (
        project.recruitments.map((recruitment) => (
          <div key={recruitment.id} className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-2">{recruitment.title}</h3>
            <p className="text-gray-600 mb-4">{recruitment.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                申请人数: {recruitment._count?.applications || 0}
              </span>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                查看申请
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">暂无招募信息</h3>
          <p className="text-gray-600 mb-4">创建招募信息来吸引团队成员加入</p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            创建招募
          </button>
        </div>
      )}
    </div>
  );
}

// 评论组件
function ProjectComments({ project, commentText, setCommentText, onAddComment }) {
  return (
    <div className="space-y-6">
      {/* 评论输入框 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">发表评论</h3>
        <div className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="输入您的评论或建议..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="4"
          />
          <div className="flex justify-end">
            <button
              onClick={onAddComment}
              disabled={!commentText.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              发表评论
            </button>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-4">
        {project.comments && project.comments.length > 0 ? (
          project.comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg border p-6">
              <div className="flex items-start space-x-3">
                <img 
                  src={comment.user.image || '/default-avatar.png'} 
                  alt={comment.user.name}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium">{comment.user.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">暂无评论</h3>
            <p className="text-gray-600">成为第一个发表评论的人</p>
          </div>
        )}
      </div>
    </div>
  );
}